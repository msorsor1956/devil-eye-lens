import json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
import paypal

class PayPalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patcher = patch.object(paypal, 'DB', str(Path(self.tmp.name) / 'orders.sqlite3'))
        self.patcher.start(); paypal.initialize()
    def tearDown(self):
        self.patcher.stop(); self.tmp.cleanup()
    def test_server_prices_ignore_client_total(self):
        self.assertEqual(paypal.selection({'kit':'single','color':'blue','quantity':1,'total':1})[-1],3999)
        self.assertEqual(paypal.selection({'kit':'twin','color':'purple','quantity':2})[-1],7999)
        for quantity in [0,11,True,1.5,'1']:
            with self.assertRaises(ValueError): paypal.selection({'kit':'single','color':'blue','quantity':quantity})
    def row(self):
        with paypal.connect() as db:
            db.execute("INSERT INTO orders (id,total,state) VALUES ('NE-TEST',3999,'created')")
            return db.execute("SELECT * FROM orders").fetchone()
    def order(self, country='US', status='COMPLETED', value='39.99'):
        return {'purchase_units':[{'custom_id':'NE-TEST','amount':{'currency_code':'USD','value':'39.99'},'shipping':{'address':{'country_code':country}},'payments':{'captures':[{'id':'CAPTURE','status':status,'amount':{'currency_code':'USD','value':value}}]}}]}
    def test_reject_country_and_wrong_capture_amount(self):
        row=self.row()
        for order in [self.order(country='GB'),self.order(value='0.01')]:
            with self.assertRaises(ValueError):paypal.record_order(row,order)
        with paypal.connect() as db:self.assertEqual(db.execute('SELECT state FROM orders').fetchone()[0],'created')
    def test_confirm_and_do_not_downgrade_paid(self):
        row=self.row()
        self.assertEqual(paypal.record_order(row,self.order()),'paid')
        paypal.record_order(row,self.order(status='PENDING'))
        with paypal.connect() as db:self.assertEqual(db.execute('SELECT state FROM orders').fetchone()[0],'paid')
    def test_http_checkout_and_duplicate_capture(self):
        import threading, urllib.request
        server=paypal.ThreadingHTTPServer(('127.0.0.1',0),paypal.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        captured=[]; purchase={}
        def fake_api(path, body=None, request_id=None):
            if path=='/v2/checkout/orders':
                self.assertNotIn('payment_source',body)
                purchase.update(body['purchase_units'][0])
                return {'id':'ORDER12345','links':[{'rel':'payer-action','href':'https://www.paypal.com/checkoutnow?token=ORDER12345'}]}
            unit={**purchase,'shipping':{'address':{'country_code':'CA'}}}
            if path.endswith('/capture'):
                captured.append(request_id)
                unit['payments']={'captures':[{'id':'CAPTURE123','status':'COMPLETED','amount':{'currency_code':'USD','value':'39.99'}}]}
                return {'status':'COMPLETED','purchase_units':[unit]}
            return {'status':'APPROVED','purchase_units':[unit]}
        def post(path,data,cookie=''):
            req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/api/paypal/'+path,data=json.dumps(data).encode(),headers={'Origin':paypal.ORIGIN,'Cookie':cookie})
            with urllib.request.urlopen(req) as response:return json.load(response), response.headers.get('Set-Cookie','').split(';')[0]
        try:
            with patch.object(paypal,'ready',True),patch.object(paypal,'api',side_effect=fake_api):
                data,cookie=post('create',{'kit':'single','color':'blue','quantity':1,'total':1,'flow':'venmo'})
                self.assertEqual(data['id'],'ORDER12345')
                data,_=post('review',{'orderID':'ORDER12345'},cookie)
                self.assertEqual(data['total'],'39.99')
                for _ in range(2):
                    data,_=post('capture',{'orderID':'ORDER12345'},cookie)
                    self.assertEqual(data['status'],'paid')
                self.assertEqual(len(captured),1)
        finally:server.shutdown();server.server_close();thread.join()

    def test_missing_webhook_signature_rejected(self):
        import threading,urllib.request,urllib.error
        server=paypal.ThreadingHTTPServer(('127.0.0.1',0),paypal.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with patch.object(paypal,'ready',True),patch.object(paypal,'api') as api:
                request=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/api/paypal/webhook',data=b'{}')
                with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(request)
                self.assertEqual(e.exception.code,400);api.assert_not_called()
        finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
