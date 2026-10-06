# Checkout operations

The dedicated `/checkout.html` uses server-owned prices ($30 single, $35 twin), $9.99 shipping, US/Canada address validation and Stripe Tax calculations for PayPal payments. Quotes are session-bound, expire in 15 minutes and are not reused after address or cart changes. Payment capture verifies the total and destination. Existing orders remain readable after the additive SQLite migration.

## Merchant tasks still required

- Stripe account DEVIL EYE LIGHT has active Tax settings but no active tax registrations as checked October 6, 2026 UTC. Calculations therefore collect zero tax where no registration exists. Confirm your actual registrations and collection obligations with your tax adviser, then add the valid registrations in Stripe. Do not invent registrations or assume the current configuration satisfies your obligations.
- Calculations use Stripe's general tangible goods tax code (`txcd_99999999`) and shipping code (`txcd_92010001`), overriding the account's unrelated service-category default. Confirm any more specific applicable product classification and the actual shipping origin with your adviser.
- Successful captures are recorded as off-Stripe Tax transactions by a durable retry worker. Monitor `Tax record requires retry` logs. Refunds, partial refunds and reversals are flagged in order state; tax reversals must currently be reconciled in Stripe by the operator. No tax filing or remittance automation is enabled.
- Apple Pay requires PayPal merchant approval and domain registration; Google Pay requires merchant eligibility. Eligibility failures are shown without claiming payment succeeded. No live card or wallet purchase has been performed as part of this build.
- Confirm and publish delivery estimates, return eligibility, return-postage responsibility, cancellation details and full warranty terms. The page transparently identifies these as not yet specified; it does not invent commitments. The current policies do not override mandatory consumer rights.
- Orders persist in the existing Railway volume. Fulfillment, customer messages, refund processing and shipment-delay notices remain operator responsibilities. No automatic email or fulfillment service is claimed.
- Finalize the retention schedule for order/payment records and review jurisdiction-specific privacy, consumer, tax and vehicle-lighting requirements. This implementation is not a certification of legal compliance.

## References used

- https://docs.stripe.com/tax/off-stripe
- https://docs.stripe.com/tax/standalone-tax-api
- https://developer.paypal.com/sdk/orders/v2/definitions/order_request
- https://www.ftc.gov/business-guidance/resources/selling-internet-prompt-delivery-rules
- https://www.cbsa-asfc.gc.ca/import/postal-postale/dtytx-drttx-eng.html

## Validation

Unit/HTTP tests cover server prices, address validation, tax totals, required consent, session ownership, duplicate order creation and capture, and webhook signature checks. Browser regression tests cover carried-over selections, form totals, invalidation and mobile widths. Provider payment authentication and real money capture require a buyer-controlled transaction.
