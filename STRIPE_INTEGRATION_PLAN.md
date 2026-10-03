# Night Eyes Stripe integration plan

Updated October 3, 2026. Supersedes the plugin-loading blocker in LAUNCH_REVIEW.md.

## Planner completed

The user selected the connected DEVIL EYE LIGHT account in live mode. Stripe's stripe_implementation_planner returned guide iguide_61VVwnGKL7RXyh0fX41DQP7ggitPi and accepted terminal leaf out_of_box_hosted. Accepted shape: hosted Checkout, web origin, provider checkout_studio. Planner calls created no charges, products, prices or checkout configuration.

Storefront: https://www.nighteyes.pro; Railway origin https://devil-eye-site-production.up.railway.app. Physical decorative automotive LED single/twin kits, selected by color and quantity. Primary flow is one-time browser checkout.

## Implementation contract

Follow https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted.

1. Add a server backend to the current static nginx deployment and durable order storage. Keep Stripe credentials exclusively in server runtime variables; prefer a restricted API key with necessary permissions. Use an isolated sandbox to develop and test before live activation.
2. Define an authoritative server catalog for single/twin kits, colors, currency, Stripe Price IDs, stock and shipping rules. Browser requests send product identifiers and bounded quantities, never trusted totals, price IDs or return URLs.
3. Create hosted Checkout Sessions server-side in payment mode with trusted success/cancel URLs and shipping collection for confirmed destinations. Omit payment_method_types to allow dynamic methods. For API versions supporting it, tag sessions with integration_identifier and an eight-letter random suffix.
4. Persist pending orders and use idempotency for retried checkout creation. Reserve and release inventory according to session expiry and payment outcomes; prevent overselling with atomic database operations.
5. Verify Stripe webhook signatures using the raw request body and environment-specific signing secret. Persist processed event IDs and apply order transitions idempotently. Fulfill only paid checkout.session.completed or checkout.session.async_payment_succeeded events. Handle async failures and expired sessions to release reservations. Success pages only display server-verified status.
6. Finalize seller, privacy, shipping, returns and warranty disclosures before enabling checkout. Enable automatic tax only after confirming applicable active registrations.
7. Verify sandbox successful/declined/canceled payments, tampered product/quantity requests, duplicate/out-of-order webhooks, invalid signatures, async success/failure and stock contention. Configure and verify live endpoint and credentials separately before activation.

## Other requested Stripe products

Invoicing is a separate requested workflow: confirm when invoices should be created and sent. Connect requires an actual third-party seller/platform funds flow. Terminal requires an in-person workflow and supported hardware/location. Billing requires a recurring offering. These requirements are not established and none of these products have been configured.

## Required merchant inputs

- Single and twin kit selling prices and currency.
- Legal seller name/address and support/privacy contact.
- Shipping destinations, rates and handling/delivery commitments.
- Cancellation, return and warranty terms.
- Sandbox connection and server deployment/database configuration.
- Intended Connect, Terminal, Billing and Invoicing workflows.

Payment setup remains unfinished. No live checkout or payment test is claimed. PR #1 remains a draft; this plan does not merge or deploy it.
