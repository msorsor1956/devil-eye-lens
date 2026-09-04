# Devil Eye Lens

## Open locally

1. Extract the complete project folder first. Do not open `index.html` from inside the ZIP archive.
2. Keep `index.html`, `styles.css`, `scroll-film.js`, and the `assets` folder together.
3. Double-click `index.html`.

The main call to action jumps to the integrated `#series` product and checkout experience inside `index.html`. A standalone `product.html` copy is also included for direct product campaigns. Product specifications are documented in `PRODUCT.md`. Public payment destinations are configured in `checkout-config.js`; never place a Stripe secret key in that browser file.

No server, package manager, or installation is required. If a browser blocks local video playback, the page automatically keeps the static hero visible and continues into the product sections.

## Railway

The included `Dockerfile` serves the same static files with nginx. Database metadata schema is in `database/schema.sql`; binary project files belong in the Railway object bucket rather than PostgreSQL.
