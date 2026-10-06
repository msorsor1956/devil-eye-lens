#!/bin/sh
# Read-only runtime diagnostic. Never log credentials or Stripe response bodies.
set +x
umask 077
case "${STRIPE_SECRET_KEY:-}" in
  '') echo 'Stripe check: key missing'; exit 0 ;;
  *[!a-zA-Z0-9_]*) echo 'Stripe check: invalid key format'; exit 0 ;;
esac
case "$STRIPE_SECRET_KEY" in
  rk_live_*|sk_live_*) ;;
  *) echo 'Stripe check: expected a live server API key'; exit 0 ;;
esac
response=$(mktemp)
trap 'rm -f "$response"' EXIT HUP INT TERM
check_price() {
  price_id=$1
  expected=$2
  status=$(printf 'header = "Authorization: Bearer %s"\n' "$STRIPE_SECRET_KEY" | curl --config - --silent --connect-timeout 5 --max-time 12 --output "$response" --write-out '%{http_code}' "https://api.stripe.com/v1/prices/$price_id" 2>/dev/null) || {
    echo 'Stripe check: network request failed'; return 1;
  }
  case "$status" in
    200) ;;
    401) echo 'Stripe check: authentication rejected (401)'; return 1 ;;
    403) echo 'Stripe check: price-read permission denied (403)'; return 1 ;;
    404) echo 'Stripe check: expected live price not found in this account (404)'; return 1 ;;
    *) echo 'Stripe check: Stripe request unsuccessful'; return 1 ;;
  esac
  jq -e --arg id "$price_id" --argjson amount "$expected" '.id == $id and .livemode == true and .active == true and .currency == "usd" and .unit_amount == $amount' "$response" >/dev/null 2>&1 || {
    echo 'Stripe check: live catalog does not match expected price'; return 1;
  }
}
if check_price price_1UNK7uDQP7ggitPiX4JfFe1p 3000 && check_price price_1UNK8EDQP7ggitPiMaMCYvvO 3500; then
  echo 'Stripe check: PASS - live key authenticated; single USD 30.00 and twin USD 35.00 verified. No payment created.'
fi
# A payment diagnostic must never prevent the static storefront starting.
exit 0
