import unittest
from unittest.mock import patch
import checkout_tax

class TaxTests(unittest.TestCase):
    def customer(self):
        return {'firstName':'Test', 'lastName':'Buyer', 'email':'buyer@example.com', 'phone':'',
            'line1':'1 Test Street','line2':'','city':'Indianapolis','state':'IN','postal':'46214','country':'US'}
    def test_address_restrictions(self):
        valid=checkout_tax.customer_details({'customer':self.customer()})
        self.assertEqual(valid['state'],'IN')
        for change in [{'country':'GB'},{'state':'XX'},{'postal':'abcd'},{'email':'no-at-sign'},{'line1':''}]:
            with self.assertRaises(ValueError):checkout_tax.customer_details({'customer':{**self.customer(),**change}})
        canada={**self.customer(),'country':'CA','state':'ON','postal':'M5V 3L9'}
        self.assertEqual(checkout_tax.customer_details({'customer':canada})['country'],'CA')
    def test_calculation_uses_physical_goods_and_shipping(self):
        result={'currency':'usd','tax_amount_exclusive':560,'amount_total':8559}
        with patch.object(checkout_tax,'stripe_request',return_value=result) as call:
            self.assertEqual(checkout_tax.calculate(self.customer(),'twin',2,3500,'quote')['amount_total'],8559)
            fields=call.call_args.args[1]
            self.assertEqual(fields['line_items[0][amount]'],7000)
            self.assertEqual(fields['line_items[0][tax_code]'],'txcd_99999999')
            self.assertEqual(fields['shipping_cost[amount]'],999)
        with patch.object(checkout_tax,'stripe_request',return_value={**result,'amount_total':1}):
            with self.assertRaises(ValueError):checkout_tax.calculate(self.customer(),'twin',2,3500,'quote')
