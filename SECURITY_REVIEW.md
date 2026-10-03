# Storefront security review

Reviewed 2026-10-03. Scope: the static website, its container configuration and public browser code. This is hardening, not a penetration-test certification or a guarantee that a system is invulnerable.

## Changes implemented

- Updated the container from nginx 1.27 to the official 1.30.5 Alpine stable release listed on Docker Hub at review time. The explicit version makes the upgrade reviewable; future security releases still require updates and rebuilding.
- Added an enforced Content Security Policy permitting local scripts, styles, images and media only. Inline event handlers, inline executable scripts, embedded frames, plugins and framing this website are blocked. No `unsafe-inline` or `unsafe-eval` exemption is present.
- Added MIME-sniffing prevention, frame denial, restrictive browser permissions, same-origin opener/resource isolation, and a referrer policy that excludes path/query details when navigating to another origin.
- Added a one-year HSTS policy scoped to the exact visited host. Railway handles public TLS; no `includeSubDomains` or preload commitment is made.
- Disabled directory listings and server-version disclosure; deny hidden files and common configuration, backup and database extensions. Unknown URLs return real 404 responses rather than a misleading homepage response.
- The static server accepts GET and HEAD only, caps request bodies and uses finite connection timeouts. This policy must be deliberately revised when authenticated APIs or Stripe webhooks are implemented.
- Application access logs omit visitor IP addresses, query strings, user-agent strings and referrers. Error logs may still contain request/client details. Railway's own edge logging is independent of this configuration.
- The Dockerfile copies public assets explicitly, rather than copying the repository, and runs `nginx -t` as a required image-build gate.

The existing browser checkout configuration contains public payment links only, not secret API keys. Payment destinations are restricted in JavaScript to HTTPS `buy.stripe.com` and `cash.app`; links use `noopener noreferrer`. Kit selections are treated as display preferences, never authoritative price or payment data. Review and fulfillment of orders require a backend.

## Verification and limits

Reviewed configuration against the official nginx header, core and rewrite directive documentation. `git diff --check` passes for these changes. Source inspection found one inline executable bootstrap; the main implementation moves that bootstrap into the local JavaScript file to preserve the strict CSP.

This workspace has neither Docker nor nginx installed. Attempting the standard package install could not obtain nginx; package-index refresh was blocked by the runtime's identity/permission limitations. Consequently this review does **not** claim a successful container build, `nginx -t` execution, live-header test, image vulnerability scan, or deployed browser CSP validation. The build-time syntax gate must pass before release. Verify after deployment that successful, 404 and 405 responses retain the headers, normal images/styles/scripts load, dialogs open/close, and video seeking works.

The repository is static: it currently has no checkout-session API, login, customer database, upload handler, tracking service or order fulfillment system to secure. There are no invented CSRF, authentication, payment verification or fraud controls for nonexistent endpoints.

## Payment implementation requirements

Before payment processing is enabled, implement server-side product/price allowlists and quantity validation, store Stripe secret keys only as hosting secrets, use signed webhook verification against the raw request body, and record event IDs to make fulfillment idempotent. Do not mark an order paid from a browser redirect or client-supplied total. Process asynchronous payment success/failure explicitly. Apply rate limits to real checkout endpoints and avoid sending personal data in URLs or logs.

The current CSP allows top-level hosted payment-link navigation but intentionally does not allow embedded Stripe scripts or frames. Any embedded payment, Connect or Terminal implementation needs a documented, narrowly scoped CSP/Permissions-Policy update based on Stripe's actual integration requirements. Change the GET/HEAD-only rule before adding server POST endpoints; do not simply disable the security policy.

Before accepting real orders, confirm seller identity/support contact, shipping destinations and rates, taxes, returns, legal disclosures, currency and authoritative prices. Connect, Billing and Terminal require confirmed business use cases rather than automatic activation.

## Operational responsibilities

Enable MFA and least-privilege access for GitHub, Railway, DNS and Stripe; protect the release branch and review dependency/container updates. These account settings were not changed or verified by this source-code review. Keep an appropriate backup/restore and incident response process once an order database exists. Edge DDoS protection and IP-aware abuse limits belong at the trusted proxy/provider boundary; blindly rate-limiting the Railway proxy address could block legitimate customers.

## References

- https://hub.docker.com/_/nginx
- https://nginx.org/en/docs/http/ngx_http_headers_module.html
- https://nginx.org/en/docs/http/ngx_http_core_module.html
- https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr
