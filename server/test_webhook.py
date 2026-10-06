import hashlib,hmac,json,sqlite3,tempfile,time,unittest
from pathlib import Path
import stripe
from webhook import initialize,process_event
class WebhookTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.db=str(Path(self.tmp.name)/'events.db');initialize(self.db)
 def tearDown(self): self.tmp.cleanup()
 def event(self,id,kind='checkout.session.completed',status='unpaid',created=1):
  return {'id':id,'created':created,'livemode':True,'type':kind,'data':{'object':{'id':'cs_live_test_fixture','object':'checkout.session','payment_status':status,'amount_total':3999,'currency':'usd','metadata':{'kit':'single'}}}}
 def test_deduplication_and_delayed_payment(self):
  e=self.event('evt_1');self.assertEqual(process_event(e,self.db),'recorded');self.assertEqual(process_event(e,self.db),'duplicate')
  with sqlite3.connect(self.db) as d:self.assertEqual(d.execute('select state from payments').fetchone()[0],'pending')
  process_event(self.event('evt_2','checkout.session.async_payment_succeeded','paid',2),self.db)
  process_event(self.event('evt_3','checkout.session.async_payment_failed','unpaid',3),self.db)
  with sqlite3.connect(self.db) as d:self.assertEqual(d.execute('select state from payments').fetchone()[0],'paid');self.assertEqual(d.execute('select count(*) from payments').fetchone()[0],1)
 def test_failure_and_mode(self):
  process_event(self.event('evt_4','checkout.session.async_payment_failed'),self.db)
  with sqlite3.connect(self.db) as d:self.assertEqual(d.execute('select state from payments').fetchone()[0],'failed')
  e=self.event('evt_test');e['livemode']=False
  with self.assertRaises(ValueError):process_event(e,self.db)
 def test_signature_tampering_and_expiry(self):
  body=json.dumps(self.event('evt_sig'));secret='whsec_unit_test_only';t=int(time.time())
  def sig(ts):return f't={ts},v1='+hmac.new(secret.encode(),f'{ts}.{body}'.encode(),hashlib.sha256).hexdigest()
  self.assertEqual(stripe.Webhook.construct_event(body,sig(t),secret)['id'],'evt_sig')
  for payload,signature in [(body+' ',sig(t)),(body,sig(t-301)),(body,'t=0,v1=bad')]:
   with self.assertRaises(Exception):stripe.Webhook.construct_event(payload,signature,secret)
if __name__=='__main__':unittest.main()
