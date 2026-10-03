# Search and social review — 2026-10-03

The canonical storefront is https://www.nighteyes.pro/. The old Railway hostname and the duplicate product.html page should consolidate to that URL. Search indexing, rich results, rankings and social reach are not guaranteed by metadata.

## Implemented crawl assets

- robots.txt allows public content to be crawled and advertises the absolute sitemap URL. It is not an access-control mechanism.
- sitemap.xml contains the canonical homepage, not the identical product.html page. Add published legal pages when ready. No guessed last-modified dates or ineffective priority/change-frequency values.

## Homepage metadata to apply

- Title: Devil’s Eye LED Projector Kits | Night Eyes
- Description: Discover Maidsail Devil’s Eye LED projectors. Preview eye colors, compare single and twin kits, and plan your 12V installation.
- Canonical URL: https://www.nighteyes.pro/ on both HTML entry points.
- Open Graph: website type; Night Eyes site name; matching title, description and canonical URL.
- Social image: https://www.nighteyes.pro/assets/film/devil-eye-scroll-poster.jpg — existing JPEG, 842 × 474. Use an accurate alt description: Exploded view of the Devil’s Eye automotive LED projector. Include image/jpeg type and dimensions. An SVG is not a reliable shared-link preview asset.
- X card: summary_large_image with the same title, description, image and image alt. Do not invent an account handle.
- WebSite JSON-LD with the canonical URL, @id https://www.nighteyes.pro/#website and name Night Eyes. Make the Night Eyes name visible in the storefront when using it in metadata.
- Do not invent Product offers, availability, ratings, reviews, GTINs, return terms, or shipping prices. Add eligible Product/Offer markup only when verified commercial details appear on the page. Do not claim merchant rich-result eligibility from incomplete product markup.

## Visibility work after deployment

1. Verify the nighteyes.pro domain property in Google Search Console using its provided DNS TXT record. No ownership verification token is available in this repository.
2. Submit https://www.nighteyes.pro/sitemap.xml, inspect the canonical homepage and request indexing. Check indexing and crawl reports after Google processes the site.
3. Check rendered metadata and the real image URL with social preview debuggers. Publish links from the business’s verified social profiles when those accounts and permission to post are provided.
4. Add confirmed business/contact information and real shipping/returns details before selling. Use useful original product descriptions, installation guidance and accurate product photography; avoid keyword stuffing or fabricated reviews.
5. Once checkout, prices, stock, destinations and policies are final, validate Product/Offer data with Google’s Rich Results Test and evaluate Merchant Center eligibility. Keep feed, page and checkout information consistent.
6. Measure the deployed page’s mobile performance and Core Web Vitals; retain on-demand video and reduced-motion support. No performance score has been measured in this review.

## Sources reviewed

- Google, Build and submit a sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google, Site names: https://developers.google.com/search/docs/appearance/site-names
- Google, General structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google, Product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Open Graph protocol: https://ogp.me/

## Verification

The sitemap is XML-parseable and uses HTTPS URLs on the intended canonical host. The referenced social image exists with the stated pixel dimensions. Production crawlability, search ownership verification, index submission and social posting remain separate deployment/account actions.
