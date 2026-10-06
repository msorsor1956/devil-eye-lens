"""PayPal hosted checkout. Prices and capture decisions stay on the server."""
import base64, hashlib, json, os, re, secrets, sqlite3, threading, time
from decimal import Decimal
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse
import checkout_tax

ORIGIN = 'https://www.nighteyes.pro'
ALLOWED_ORIGINS = {ORIGIN, 'https://nighteyes.pro', 'https://devil-eye-site-production.up.railway.app'}
API = 'https://api-m.paypal.com'
DB = os.environ.get('PAYPAL_ORDERS_DB', '/data/night-eyes/paypal.sqlite3')
PRICES = {'single': 3000, 'twin': 3500}
COLORS = {'blue', 'green', 'purple', 'red'}
EVENTS = ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.PENDING', 'PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED']
ready = False
webhook_id = None
_token = ('', 0)
_lock = threading.Lock()

def connect():
    db = sqlite3.connect(DB, timeout=20)
    db.row_factory = sqlite3.Row
    return db

def initialize():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, paypal_id TEXT UNIQUE, session TEXT, kit TEXT, color TEXT, quantity INTEGER, total INTEGER, state TEXT, capture_id TEXT, shipping TEXT, email TEXT, created INTEGER)')
        columns = {r[1] for r in db.execute('PRAGMA table_info(orders)')}
        for name, kind in [('quote_id','TEXT'), ('tax','INTEGER DEFAULT 0'), ('tax_calculation','TEXT'), ('tax_transaction','TEXT'), ('customer','TEXT'), ('policy_version','TEXT')]:
            if name not in columns: db.execute(f'ALTER TABLE orders ADD COLUMN {name} {kind}')
        db.execute('CREATE UNIQUE INDEX IF NOT EXISTS order_quote ON orders(quote_id)')
        db.execute('CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, session TEXT, payload TEXT, created INTEGER)')
        db.execute('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT, created INTEGER)')

def token():
    global _token
    with _lock:
        if _token[1] > time.time() + 60:
            return _token[0]
        client = os.environ['PAYPAL_CLIENT_ID'].strip()
        secret = os.environ['PAYPAL_CLIENT_SECRET'].strip()
        auth = base64.b64encode((client + ':' + secret).encode()).decode()
        req = Request(API + '/v1/oauth2/token', data=b'grant_type=client_credentials', headers={'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded'})
        with urlopen(req, timeout=15) as response:
            data = json.load(response)
        _token = (data['access_token'], time.time() + data['expires_in'])
        return _token[0]

def api(path, body=None, request_id=None):
    headers = {'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    if request_id:
        headers['PayPal-Request-Id'] = request_id
    req = Request(API + path, data=None if body is None else json.dumps(body).encode(), headers=headers)
    with urlopen(req, timeout=20) as response:
        return json.load(response)

def money(cents):
    return f'{cents // 100}.{cents % 100:02d}'

def selection(data):
    kit, color, quantity = data.get('kit'), data.get('color'), data.get('quantity')
    if kit not in PRICES or color not in COLORS or type(quantity) is not int or not 1 <= quantity <= 10:
        raise ValueError('Choose a valid kit, color and quantity from 1 to 10.')
    return kit, color, quantity, PRICES[kit] * quantity + 999

def valid_amount(amount, total):
    return amount.get('currency_code') == 'USD' and Decimal(amount.get('value', '-1')) == Decimal(total) / 100

def record_order(row, order):
    units = order.get('purchase_units', [])
    if len(units) != 1 or not valid_amount(units[0].get('amount', {}), row['total']):
        raise ValueError('Order amount could not be verified. Contact support.')
    unit = units[0]
    if unit.get('custom_id') != row['id']:
        raise ValueError('Order reference could not be verified.')
    shipping = unit.get('shipping', {})
    if shipping.get('address', {}).get('country_code') not in {'US', 'CA'}:
        raise ValueError('We currently ship only to the USA and Canada. No payment was captured by this request.')
    if row['customer']:
        expected = checkout_tax.shipping_for(json.loads(row['customer']))['address']
        actual = shipping.get('address', {})
        normalize = lambda value: re.sub(r'[^\w]', '', str(value)).casefold()
        if any(normalize(actual.get(k, '')) != normalize(v) for k, v in expected.items()):
            raise ValueError('Shipping address changed. Return to checkout and recalculate the total.')
    captures = unit.get('payments', {}).get('captures', [])
    state, capture_id = 'approved', None
    if captures:
        if len(captures) != 1 or not valid_amount(captures[0].get('amount', {}), row['total']):
            raise ValueError('Payment amount could not be verified. Contact support.')
        capture = captures[0]
        capture_id = capture['id']
        state = {'COMPLETED': 'paid', 'PENDING': 'pending', 'DECLINED': 'denied', 'REFUNDED': 'refunded', 'PARTIALLY_REFUNDED': 'partially_refunded'}.get(capture['status'], 'review')
    email = (order.get('payment_source', {}).get('venmo', {}).get('email_address') or order.get('payment_source', {}).get('paypal', {}).get('email_address')) or order.get('payer', {}).get('email_address')
    with connect() as db:
        db.execute("UPDATE orders SET state=CASE WHEN state IN ('refunded','reversed','partially_refunded','refund_review') THEN state WHEN state='paid' AND ? IN ('approved','pending','denied') THEN state ELSE ? END,capture_id=COALESCE(?,capture_id),shipping=?,email=COALESCE(email,?) WHERE id=?", (state, state, capture_id, json.dumps(shipping), email, row['id']))
    return state

def sync_tax_records():
    # Durable retry: a tax-reporting failure must never imply a successful payment failed.
    while True:
        try:
            with connect() as db:
                rows = db.execute("SELECT * FROM orders WHERE capture_id IS NOT NULL AND state IN ('paid','refunded','partially_refunded','refund_review','reversed') AND tax_calculation IS NOT NULL AND tax_transaction IS NULL LIMIT 20").fetchall()
                db.execute('DELETE FROM quotes WHERE created < ?', (int(time.time()) - 10800,))
            for row in rows:
                try:
                    result = checkout_tax.stripe_request('tax/transactions/create_from_calculation', {'calculation': row['tax_calculation'], 'reference': row['id'], 'posted_at': row['created']}, row['id'] + '-tax')
                    with connect() as db: db.execute('UPDATE orders SET tax_transaction=? WHERE id=?', (result['id'], row['id']))
                except Exception as error:
                    print('Tax record requires retry: ' + row['id'] + ' ' + type(error).__name__, flush=True)
        except Exception:
            print('Tax reconciliation temporarily unavailable', flush=True)
        time.sleep(60)

def bootstrap():
    global ready, webhook_id
    try:
        token()
        url = ORIGIN + '/api/paypal/webhook'
        existing = api('/v1/notifications/webhooks').get('webhooks', [])
        hook = next((h for h in existing if h['url'] == url), None)
        if hook is None:
            hook = api('/v1/notifications/webhooks', {'url': url, 'event_types': [{'name': e} for e in EVENTS]})
        if not set(EVENTS).issubset({e['name'] for e in hook.get('event_types', [])}) and '*' not in {e['name'] for e in hook.get('event_types', [])}:
            raise ValueError('Webhook event configuration requires review')
        webhook_id = hook['id']
        ready = True
        print('PayPal live credentials verified; webhook connected; checkout ready', flush=True)
        try:
            with urlopen('https://paypalobjects.com/devdoc/apple-pay/well-known/apple-developer-merchantid-domain-association', timeout=15) as response:
                association = response.read(200000)
            if association and len(association) < 200000:
                os.makedirs('/usr/share/nginx/html/.well-known', exist_ok=True)
                target = '/usr/share/nginx/html/.well-known/apple-developer-merchantid-domain-association'
                with open(target, 'wb') as file: file.write(association)
                os.chmod('/usr/share/nginx/html/.well-known', 0o755)
                os.chmod(target, 0o644)
                print('Apple Pay association file ready for domain registration', flush=True)
        except Exception:
            print('Apple Pay association file could not be prepared', flush=True)
    except Exception as error:
        print('PayPal setup unavailable: ' + type(error).__name__ + (' HTTP ' + str(error.code) if isinstance(error, HTTPError) else ''), flush=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass
    def reply(self, status, data, cookie=None):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        if cookie:
            self.send_header('Set-Cookie', '__Host-night-paypal=' + cookie + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=10800')
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        if self.path == '/api/paypal/config':
            return self.reply(200 if ready else 503, {'clientId': os.environ.get('PAYPAL_CLIENT_ID', '').strip()} if ready else {'error': 'Payment connection unavailable'})
        if self.path == '/api/paypal/health':
            return self.reply(200, {'ready': ready})
        self.reply(404, {'error': 'Not found'})
    def do_POST(self):
        try:
            if self.path not in {'/api/paypal/quote', '/api/paypal/create', '/api/paypal/capture', '/api/paypal/review', '/api/paypal/webhook'}:
                return self.reply(404, {'error': 'Not found'})
            if not ready:
                return self.reply(503, {'error': 'PayPal is temporarily unavailable. Please try again later.'})
            if self.path != '/api/paypal/webhook' and self.headers.get('Origin') not in ALLOWED_ORIGINS:
                return self.reply(403, {'error': 'Please start checkout at www.nighteyes.pro.'})
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 262144:
                return self.reply(413, {'error': 'Invalid request size'})
            self.connection.settimeout(10)
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError('Invalid request')
            if self.path == '/api/paypal/webhook':
                return self.webhook(data)
            cookie = SimpleCookie(self.headers.get('Cookie', ''))
            session = cookie['__Host-night-paypal'].value if '__Host-night-paypal' in cookie else secrets.token_urlsafe(32)
            session_hash = hashlib.sha256(session.encode()).hexdigest()
            if self.path == '/api/paypal/quote':
                kit, color, quantity, _ = selection(data)
                customer = checkout_tax.customer_details(data)
                with connect() as db:
                    count = db.execute('SELECT count(*) FROM quotes WHERE session=? AND created>?', (session_hash, int(time.time()) - 60)).fetchone()[0]
                if count >= 5:
                    return self.reply(429, {'error': 'Please wait a minute before recalculating.'}, session)
                quote_id = 'NQ-' + secrets.token_hex(24)
                try:
                    calculation = checkout_tax.calculate(customer, kit, quantity, PRICES[kit], quote_id)
                except HTTPError as error:
                    print('Tax calculation unavailable HTTP ' + str(error.code), flush=True)
                    return self.reply(503, {'error': 'We could not calculate tax. Check your address or contact support@nighteyes.pro. No payment has been taken.'}, session)
                quote = {'kit':kit, 'color':color, 'quantity':quantity, 'customer':customer,
                    'subtotal':PRICES[kit]*quantity, 'shipping':999, 'tax':calculation['tax_amount_exclusive'],
                    'total':calculation['amount_total'], 'calculation':calculation['id'],
                    'expires':min(int(time.time()) + 900, calculation['expires_at']), 'policyVersion':checkout_tax.POLICY_VERSION}
                with connect() as db:
                    db.execute('INSERT INTO quotes VALUES (?,?,?,?)', (quote_id, session_hash, json.dumps(quote), int(time.time())))
                return self.reply(200, {**{k:quote[k] for k in ['subtotal','shipping','tax','total','expires','policyVersion']}, 'quoteID':quote_id, 'currency':'USD'}, session)
            if self.path == '/api/paypal/create':
                if data.get('acceptedTerms') is not True or data.get('policyVersion') != checkout_tax.POLICY_VERSION:
                    raise ValueError('Please review and accept the checkout terms before paying.')
                quote_id = data.get('quoteID')
                if not isinstance(quote_id, str) or not re.fullmatch(r'NQ-[a-f0-9]{48}', quote_id):
                    raise ValueError('Review your address and calculate your total before paying.')
                with connect() as db:
                    stored = db.execute('SELECT payload FROM quotes WHERE id=? AND session=?', (quote_id, session_hash)).fetchone()
                if not stored:
                    raise ValueError('Your checkout session expired. Please calculate your total again.')
                quote = json.loads(stored['payload'])
                if quote['expires'] < time.time():
                    raise ValueError('Your total expired. Please calculate it again before paying.')
                flow = data.get('flow')
                if flow not in {'venmo','card','paypal','applepay','googlepay'}:
                    raise ValueError('Choose a supported payment method.')
                kit, color, quantity, total = (quote[k] for k in ['kit','color','quantity','total'])
                customer = quote['customer']
                local_id = 'NE-' + secrets.token_hex(12).upper()
                with connect() as db:
                    db.execute('INSERT OR IGNORE INTO orders (id,session,kit,color,quantity,total,state,created,quote_id,tax,tax_calculation,customer,email,policy_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (local_id,session_hash,kit,color,quantity,total,'created',int(time.time()),quote_id,quote['tax'],quote['calculation'],json.dumps(customer),customer['email'],checkout_tax.POLICY_VERSION))
                    row = db.execute('SELECT * FROM orders WHERE quote_id=? AND session=?', (quote_id, session_hash)).fetchone()
                local_id = row['id']
                if row['paypal_id']:
                    if row['state'] in {'paid','pending','refunded','partially_refunded','reversed','refund_review'}:
                        raise ValueError('This order already has a payment. Contact support before paying again.')
                    return self.reply(200, {'id':row['paypal_id']}, session)
                payload = {'intent':'CAPTURE',
                    'application_context': {'brand_name':'Night Eyes', 'shipping_preference':'SET_PROVIDED_ADDRESS', 'user_action':'PAY_NOW'},
                    'purchase_units':[{'custom_id':local_id, 'invoice_id':local_id,
                        'description':f'Night Eyes {kit} projector / {color}',
                        'shipping':checkout_tax.shipping_for(customer),
                        'items':[{'name':f'Night Eyes {kit} projector', 'description':color + ' lighting selection', 'quantity':str(quantity), 'category':'PHYSICAL_GOODS', 'unit_amount':{'currency_code':'USD','value':money(PRICES[kit])}}],
                        'amount':{'currency_code':'USD','value':money(total), 'breakdown':{
                            'item_total':{'currency_code':'USD','value':money(quote['subtotal'])},
                            'shipping':{'currency_code':'USD','value':'9.99'},
                            'tax_total':{'currency_code':'USD','value':money(quote['tax'])}}}}]}
                order = api('/v2/checkout/orders', payload, local_id)
                with connect() as db:
                    db.execute('UPDATE orders SET paypal_id=? WHERE id=?', (order['id'], local_id))
                return self.reply(200, {'id':order['id']}, session)
            order_id = data.get('orderID', '')
            if not isinstance(order_id, str) or not re.fullmatch('[A-Z0-9]{8,32}', order_id):
                raise ValueError('Invalid order reference')
            with connect() as db:
                row = db.execute('SELECT * FROM orders WHERE paypal_id=? AND session=?', (order_id, session_hash)).fetchone()
            if not row or row['created'] < time.time() - 10800:
                return self.reply(403, {'error': 'Checkout session expired. Contact support if you already paid.'})
            if self.path == '/api/paypal/review':
                return self.reply(200, {'status': row['state'], 'reference': row['id'], 'total': money(row['total']), 'tax': money(row['tax'] or 0), 'kit': row['kit'], 'color': row['color'], 'quantity': row['quantity']})
            if row['state'] in {'paid', 'refunded', 'reversed', 'partially_refunded'}:
                return self.reply(200, {'status': row['state'], 'reference': row['id']})
            order = api('/v2/checkout/orders/' + order_id)
            if order.get('status') not in {'APPROVED', 'COMPLETED'}:
                raise ValueError('Please approve the payment in PayPal first.')
            state = record_order(row, order)
            if order['status'] != 'COMPLETED':
                order = api('/v2/checkout/orders/' + order_id + '/capture', {}, row['id'] + '-capture')
                state = record_order(row, order)
            return self.reply(200, {'status': state, 'reference': row['id']})
        except ValueError as error:
            self.reply(400, {'error': str(error) if not isinstance(error, json.JSONDecodeError) else 'Invalid checkout request.'})
        except (KeyError, StopIteration, TypeError):
            self.reply(400, {'error': 'Unable to verify checkout. Check your details or contact support@nighteyes.pro.'})
        except Exception as error:
            print('PayPal request failed: ' + type(error).__name__ + (' HTTP ' + str(error.code) if isinstance(error, HTTPError) else ''), flush=True)
            self.reply(502, {'error': 'Unable to confirm payment. Try again using this page; contact support if the issue persists.'})
    def webhook(self, event):
        fields = {'auth_algo': 'PAYPAL-AUTH-ALGO', 'cert_url': 'PAYPAL-CERT-URL', 'transmission_id': 'PAYPAL-TRANSMISSION-ID', 'transmission_sig': 'PAYPAL-TRANSMISSION-SIG', 'transmission_time': 'PAYPAL-TRANSMISSION-TIME'}
        if not all(self.headers.get(v) for v in fields.values()):
            return self.reply(400, {'error': 'Invalid signature'})
        verification = api('/v1/notifications/verify-webhook-signature', {**{k: self.headers[v] for k,v in fields.items()}, 'webhook_id': webhook_id, 'webhook_event': event})
        if verification.get('verification_status') != 'SUCCESS':
            return self.reply(400, {'error': 'Invalid signature'})
        event_id, kind = event['id'], event['event_type']
        resource = event.get('resource', {})
        with connect() as db:
            if db.execute('SELECT 1 FROM events WHERE id=?', (event_id,)).fetchone():
                return self.reply(200, {'status': 'duplicate'})
            order_id = resource.get('supplementary_data', {}).get('related_ids', {}).get('order_id')
            row = db.execute('SELECT * FROM orders WHERE paypal_id=? OR capture_id=?', (order_id, resource.get('supplementary_data', {}).get('related_ids', {}).get('capture_id') or resource.get('id'))).fetchone()
        if row and kind == 'PAYMENT.CAPTURE.COMPLETED':
            record_order(row, api('/v2/checkout/orders/' + row['paypal_id']))
        elif row and kind in EVENTS:
            state = {'PAYMENT.CAPTURE.PENDING': 'pending', 'PAYMENT.CAPTURE.DENIED': 'denied', 'PAYMENT.CAPTURE.REFUNDED': 'refund_review', 'PAYMENT.CAPTURE.REVERSED': 'reversed'}[kind]
            with connect() as db:
                if state not in {'pending', 'denied'} or row['state'] not in {'paid', 'refunded', 'reversed'}:
                    db.execute('UPDATE orders SET state=? WHERE id=?', (state, row['id']))
        with connect() as db:
            db.execute('INSERT OR IGNORE INTO events VALUES (?,?,?)', (event_id, kind, int(time.time())))
        self.reply(200, {'status': 'received'})

if __name__ == '__main__':
    os.umask(0o077)
    initialize()
    threading.Thread(target=bootstrap, daemon=True).start()
    threading.Thread(target=sync_tax_records, daemon=True).start()
    ThreadingHTTPServer(('127.0.0.1', 3001), Handler).serve_forever()
