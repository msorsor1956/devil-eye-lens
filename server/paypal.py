"""PayPal hosted checkout. Prices and capture decisions stay on the server."""
import base64, hashlib, json, os, re, secrets, sqlite3, threading, time
from decimal import Decimal
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse

ORIGIN = 'https://www.nighteyes.pro'
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
    captures = unit.get('payments', {}).get('captures', [])
    state, capture_id = 'approved', None
    if captures:
        if len(captures) != 1 or not valid_amount(captures[0].get('amount', {}), row['total']):
            raise ValueError('Payment amount could not be verified. Contact support.')
        capture = captures[0]
        capture_id = capture['id']
        state = {'COMPLETED': 'paid', 'PENDING': 'pending', 'DECLINED': 'denied', 'REFUNDED': 'refunded', 'PARTIALLY_REFUNDED': 'partially_refunded'}.get(capture['status'], 'review')
    email = order.get('payment_source', {}).get('paypal', {}).get('email_address') or order.get('payer', {}).get('email_address')
    with connect() as db:
        db.execute("UPDATE orders SET state=CASE WHEN state IN ('refunded','reversed','partially_refunded','refund_review') THEN state WHEN state='paid' AND ? IN ('approved','pending','denied') THEN state ELSE ? END,capture_id=COALESCE(?,capture_id),shipping=?,email=? WHERE id=?", (state, state, capture_id, json.dumps(shipping), email, row['id']))
    return state

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
        if self.path == '/api/paypal/health':
            return self.reply(200, {'ready': ready})
        self.reply(404, {'error': 'Not found'})
    def do_POST(self):
        try:
            if self.path not in {'/api/paypal/create', '/api/paypal/capture', '/api/paypal/review', '/api/paypal/webhook'}:
                return self.reply(404, {'error': 'Not found'})
            if not ready:
                return self.reply(503, {'error': 'PayPal is temporarily unavailable. Please try again later.'})
            if self.path != '/api/paypal/webhook' and self.headers.get('Origin') != ORIGIN:
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
            if self.path == '/api/paypal/create':
                kit, color, quantity, total = selection(data)
                local_id = 'NE-' + secrets.token_hex(12).upper()
                with connect() as db:
                    count = db.execute('SELECT count(*) FROM orders WHERE session=? AND created>?', (session_hash, int(time.time()) - 60)).fetchone()[0]
                    if count >= 5:
                        return self.reply(429, {'error': 'Please wait a minute before trying again.'})
                    db.execute('INSERT INTO orders (id,session,kit,color,quantity,total,state,created) VALUES (?,?,?,?,?,?,?,?)', (local_id, session_hash, kit, color, quantity, total, 'created', int(time.time())))
                order = api('/v2/checkout/orders', {
                    'intent': 'CAPTURE',
                    'purchase_units': [{'custom_id': local_id, 'invoice_id': local_id, 'description': f'Night Eyes {kit} projector / {color}',
                        'items': [{'name': f'Night Eyes {kit} projector', 'description': color + ' lighting selection', 'quantity': str(quantity), 'category': 'PHYSICAL_GOODS', 'unit_amount': {'currency_code': 'USD', 'value': money(PRICES[kit])}}],
                        'amount': {'currency_code': 'USD', 'value': money(total), 'breakdown': {'item_total': {'currency_code': 'USD', 'value': money(total - 999)}, 'shipping': {'currency_code': 'USD', 'value': '9.99'}}}}],
                    'payment_source': {'paypal': {'experience_context': {'brand_name': 'Night Eyes', 'user_action': 'CONTINUE', 'shipping_preference': 'GET_FROM_FILE', 'return_url': ORIGIN + '/paypal-return.html', 'cancel_url': ORIGIN + '/paypal-return.html?cancelled=1'}}}
                }, local_id)
                url = next(link['href'] for link in order['links'] if link['rel'] in {'payer-action', 'approve'})
                parsed = urlparse(url)
                if parsed.scheme != 'https' or parsed.hostname not in {'www.paypal.com', 'paypal.com'}:
                    raise ValueError('Unexpected payment destination')
                with connect() as db:
                    db.execute('UPDATE orders SET paypal_id=? WHERE id=?', (order['id'], local_id))
                return self.reply(200, {'url': url}, session)
            order_id = data.get('orderID', '')
            if not isinstance(order_id, str) or not re.fullmatch('[A-Z0-9]{8,32}', order_id):
                raise ValueError('Invalid order reference')
            with connect() as db:
                row = db.execute('SELECT * FROM orders WHERE paypal_id=? AND session=?', (order_id, session_hash)).fetchone()
            if not row or row['created'] < time.time() - 10800:
                return self.reply(403, {'error': 'Checkout session expired. Contact support if you already paid.'})
            if self.path == '/api/paypal/review':
                return self.reply(200, {'status': row['state'], 'reference': row['id'], 'total': money(row['total']), 'kit': row['kit'], 'color': row['color'], 'quantity': row['quantity']})
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
        except (ValueError, KeyError, StopIteration, TypeError):
            self.reply(400, {'error': 'Unable to verify checkout. Check your selection and USA/Canada shipping address, or contact support@nighteyes.pro.'})
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
    ThreadingHTTPServer(('127.0.0.1', 3001), Handler).serve_forever()
