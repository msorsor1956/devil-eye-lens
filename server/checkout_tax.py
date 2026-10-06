"""Address-based Stripe Tax for PayPal payments. No client-provided prices."""
import json
import os
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REGIONS = {
    'US': set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split()),
    'CA': set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split()),
}
POLICY_VERSION = '2026-10-06'

def clean(value, maximum=100, required=True):
    if not isinstance(value, str):
        raise ValueError('Check your customer and address details.')
    value = ' '.join(value.split())
    if (required and not value) or len(value) > maximum or any(ord(c) < 32 for c in value):
        raise ValueError('Check your customer and address details.')
    return value

def customer_details(data):
    raw = data.get('customer', {})
    if not isinstance(raw, dict):
        raise ValueError('Customer details are required.')
    result = {k: clean(raw.get(k, ''), limit, required) for k, limit, required in [
        ('firstName', 60, True), ('lastName', 60, True), ('email', 254, True),
        ('phone', 30, False), ('line1', 150, True), ('line2', 150, False),
        ('city', 100, True), ('state', 2, True), ('postal', 12, True), ('country', 2, True)]}
    result['country'] = result['country'].upper()
    result['state'] = result['state'].upper()
    result['postal'] = result['postal'].upper()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', result['email']):
        raise ValueError('Enter a valid email address.')
    if result['country'] not in REGIONS or result['state'] not in REGIONS[result['country']]:
        raise ValueError('Choose a valid US state or Canadian province.')
    pattern = r'\d{5}(?:-\d{4})?' if result['country'] == 'US' else r'[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d'
    if not re.fullmatch(pattern, result['postal']):
        raise ValueError('Enter a valid ZIP or Canadian postal code.')
    return result

def shipping_for(customer):
    return {'name': {'full_name': customer['firstName'] + ' ' + customer['lastName']}, 'address': {
        'address_line_1': customer['line1'], 'address_line_2': customer['line2'],
        'admin_area_2': customer['city'], 'admin_area_1': customer['state'],
        'postal_code': customer['postal'], 'country_code': customer['country']}}

def stripe_request(path, fields, request_id):
    key = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if not key:
        raise RuntimeError('Tax connection unavailable')
    request = Request('https://api.stripe.com/v1/' + path, data=urlencode(fields).encode(), headers={
        'Authorization': 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20', 'Idempotency-Key': request_id})
    with urlopen(request, timeout=20) as response:
        return json.load(response)

def calculate(customer, kit, quantity, unit_price, reference):
    fields = {'currency': 'usd', 'customer_details[address_source]': 'shipping',
        'line_items[0][amount]': unit_price * quantity, 'line_items[0][quantity]': quantity,
        'line_items[0][reference]': kit, 'line_items[0][tax_code]': 'txcd_99999999',
        'line_items[0][tax_behavior]': 'exclusive', 'shipping_cost[amount]': 999,
        'shipping_cost[tax_behavior]': 'exclusive', 'shipping_cost[tax_code]': 'txcd_92010001'}
    for key, local in [('line1','line1'), ('line2','line2'), ('city','city'), ('state','state'), ('postal_code','postal'), ('country','country')]:
        fields['customer_details[address][' + key + ']'] = customer[local]
    result = stripe_request('tax/calculations', fields, reference)
    tax, total = result['tax_amount_exclusive'], result['amount_total']
    if type(tax) is not int or tax < 0 or total != unit_price * quantity + 999 + tax or result.get('currency') != 'usd':
        raise ValueError('The total could not be verified. Please try again.')
    return result
