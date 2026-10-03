# October showroom upgrade

Reading this as a premium automotive product storefront for custom-build enthusiasts, optimized for exploring variants and selecting the appropriate kit. Native HTML/CSS/JS remains the implementation family.

Design variance 8, motion intensity 5, visual density 3, interaction depth 7, 3D intensity 0.

## Source decisions

- Premium Web + Mobile Builder: refreshed September 29 visual-effects sources reviewed.
- Taste-Skill: current upstream design guidance reviewed.
- dashersw/liquid-glass-js: adapted the glass layout primitive with license retained. CSS backdrop blur avoids page screenshots and continuous WebGL rendering. It is not full refractive liquid glass.
- oso95/scroll-world: reviewed motion, fallback, mobile seek and media guidance. The existing product film is now on demand, rather than blocking product discovery behind a scroll sequence. No new generated media, paid generation, or copied engine code.
- liquid-logo source lookup returned 404. No unavailable code was imported.
- Shadergradient and React Three Fiber were not installed: this is a static HTML project and the existing media already illustrate the product.

## Changed

Visible glass navigation, split product hero, synchronized blue/green/purple previews, directional blink demo, product gallery enlargement, quantity validation, optional local selection persistence, fitment guidance, FAQs, clearer unavailable-payment states, and mobile navigation.

Preserves existing product assets, #series, #construction, #fitment, #projector-story and product.html. Both entry points use the same commerce implementation. Corrects undocumented 5–36V/3-inch claims to the product record's 12V and ABS housing. Does not invent pricing, shipping terms or availability.

## Payment readiness

Payment URLs remain unset. This is not a completed Stripe integration. Before enabling payments, confirm kit prices, shipping and terms; use server-created Checkout Sessions to transfer validated selections and a signature-verified webhook for paid orders. Existing generic public-link support explicitly says selections are not transferred.

## Verification

JavaScript syntax and static HTML/asset checks are run locally. DOM interaction tests cover selection, local persistence, modal behavior and invalid quantities. Desktop/mobile visual review must be completed on a browser-accessible preview before merging. No claim of a verified visual match or production deployment is made.
