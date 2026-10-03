# Launch review — October 3, 2026

## Prepared in the upgrade branch

The original live page still claims checkout availability and inconsistent specifications. The upgrade offers visible navigation, direct product selection, controlled visual previews, on-demand film, gallery enlargement, fitment guidance and honest ordering availability.

Security: static-origin CSP, anti-framing, MIME protection, HSTS, restricted browser permissions, read-only routes, hidden/config file blocking and reduced access logs. No API secrets belong in checkout-config.js. These controls do not constitute a penetration test or guarantee complete security. Edge security, account MFA, access reviews and monitoring remain operator responsibilities.

Privacy: remembering a kit is opt-in; visitors can clear saved preferences. No analytics or advertising pixels are added. Privacy, terms and shipping/returns pages are clearly marked drafts and noindexed, because seller/contact/retention/contractual details are missing. Draft pages must be finalized before payments launch.

Search/social: canonical www domain, descriptive metadata, real-image Open Graph/Twitter previews, WebSite data, robots and sitemap. No fabricated ratings, prices, profiles or product offers. Search Console ownership and sitemap submission remain outstanding.

## Stripe continuation

User confirmed installation of Stripe in ChatGPT on October 3. The running tool registry still exposes no Stripe tools, including stripe_implementation_planner. Installation is not being requested again. Start a fresh session to load the installed plugin; confirm account/sandbox and run the planner before implementation. Do not fall back to unrelated connectors while this refresh is pending. The Codex executable is absent in this workspace.

Current site has no payment backend, webhook endpoint, order database or actual configured Stripe price. Generic payment links do not transfer selected kit/color/quantity and are disabled unless explicitly opted into in configuration. No live keys have been added and no payment has been tested.

Planner context: Night Eyes / Devil’s Eye, https://www.nighteyes.pro (original https://devil-eye-site-production.up.railway.app), general merchandise with current focus on decorative automotive LED projector single/twin kits. Requested products: Payments, Connect, Terminal, Billing, Invoicing. Confirm whether third-party sellers, recurring purchases, in-person sales and invoice workflows actually apply. Do not invent marketplace or subscription requirements.

Need: confirmed single/twin prices and currency; legal seller name and address; support/privacy contact; shipping destinations/costs; cancellation/return/warranty terms; selected Stripe account and test environment. Keep secret keys in Railway server variables. Server checkout must validate catalog and quantity, and fulfill only after signature-verified, idempotently processed payment events. Run planner to settle final architecture.

## Validation and release

JavaScript syntax, HTML assets/links/IDs and DOM interaction checks pass. Real rendered desktop/mobile review of the upgrade remains pending (cloud browser cannot reach local preview); production browser inspection confirms old content remains live. Docker build and deployment headers need CI/deployment verification. The user’s production domain was previously mapped to service port80 and responds over HTTPS.

Do not claim these changes are live until the PR is published and the deployed site verified. An earlier automatic approval review rejected a main-branch push for lack of explicit production publishing authorization. Work is preserved in draft PR1.
