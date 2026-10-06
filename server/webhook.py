"""Private Stripe event receiver; durable payment records, no automatic shipping."""
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import stripe

EVENTS = {'checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'}

def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS payments (session_id TEXT PRIMARY KEY, state TEXT NOT NULL, amount INTEGER, currency TEXT, payment_intent TEXT, metadata TEXT NOT NULL, updated INTEGER NOT NULL)')
    os.chmod(path, 0o600)

def process_event(event, path):
    if event.get('livemode') is not True:
        raise ValueError('Live event required')
    kind = event.get('type')
    if kind not in EVENTS:
        return 'ignored'
    session = event['data']['object']
    if session.get('object') != 'checkout.session' or not session.get('id', '').startswith('cs_'):
        raise ValueError('Invalid session')
    paid = session.get('payment_status') == 'paid'
    state = 'paid' if paid else 'failed' if kind.endswith('async_payment_failed') else 'pending'
    # A completed checkout can still be unpaid for delayed payment methods.
    with sqlite3.connect(path, timeout=10) as db:
        db.execute('BEGIN IMMEDIATE')
        existing = db.execute('SELECT 1 FROM events WHERE id=?', (event['id'],)).fetchone()
        if existing:
            return 'duplicate'
        db.execute('INSERT INTO events VALUES (?,?,?)', (event['id'], kind, event['created']))
        db.execute('''INSERT INTO payments VALUES (?,?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET
          state=CASE WHEN payments.state='paid' THEN 'paid' WHEN excluded.state='paid' THEN 'paid'
                     WHEN excluded.updated >= payments.updated THEN excluded.state ELSE payments.state END,
          amount=COALESCE(excluded.amount,payments.amount), currency=COALESCE(excluded.currency,payments.currency),
          payment_intent=COALESCE(excluded.payment_intent,payments.payment_intent),
          metadata=CASE WHEN excluded.updated>=payments.updated THEN excluded.metadata ELSE payments.metadata END,
          updated=MAX(payments.updated,excluded.updated)''',
          (session['id'], state, session.get('amount_total'), session.get('currency'),
           session.get('payment_intent') if isinstance(session.get('payment_intent'),str) else None,
           json.dumps({k:v for k,v in session.get('metadata',{}).items() if k in {'kit','color','quantity','order_id'}}), event['created']))
    return 'recorded'

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass
    def reply(self, status, result):
        body=json.dumps({'status':result}).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        if self.path == '/api/stripe/health':
            return self.reply(200 if os.environ.get('STRIPE_WEBHOOK_SECRET') else 503,
                              'ready' if os.environ.get('STRIPE_WEBHOOK_SECRET') else 'not_configured')
        self.reply(405,'method_not_allowed')
    def do_POST(self):
        if self.path != '/api/stripe/webhook':
            return self.reply(404,'not_found')
        secret=os.environ.get('STRIPE_WEBHOOK_SECRET')
        if not secret:
            return self.reply(503,'not_configured')
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0 < length <= 262144:
                return self.reply(413,'invalid_size')
            self.connection.settimeout(10)
            body=self.rfile.read(length)
            stripe.Webhook.construct_event(body,self.headers.get('Stripe-Signature',''),secret,tolerance=300)
            event=json.loads(body)
            # Stripe SDK rejects stale signatures; reject future timestamps as well.
            import time
            timestamp=int(next(x[2:] for x in self.headers.get('Stripe-Signature','').split(',') if x.startswith('t=')))
            if abs(time.time()-timestamp)>300:
                raise ValueError('Timestamp outside tolerance')
        except Exception:
            return self.reply(400,'invalid_signature')
        try:
            result=process_event(event,self.server.db_path)
        except (ValueError,KeyError,TypeError):
            return self.reply(400,'invalid_event')
        except sqlite3.Error:
            print('Stripe webhook: persistence failed; delivery will be retried',flush=True)
            return self.reply(500,'retry')
        print('Stripe webhook: '+result,flush=True)
        self.reply(200,result)

if __name__=='__main__':
    os.umask(0o077)
    path=os.environ.get('STRIPE_EVENTS_DB','/data/night-eyes/stripe-events.sqlite3')
    initialize(path)
    server=ThreadingHTTPServer(('127.0.0.1',3000),Handler)
    server.daemon_threads=True
    server.db_path=path
    print('Stripe webhook receiver started',flush=True)
    server.serve_forever()
