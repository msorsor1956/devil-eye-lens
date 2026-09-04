# Black Automotive LED Devil-Eye Projector

## Project status

Reference collection initialized and the canonical design reference is locked. Website implementation has not started.

## Project structure

- `reference/` — supplied product imagery and visual evidence.
- `site/` — website source files will be created here in a later approved step.
- `backups/` — timestamped copies of the current website must be placed here before every site change.
- `screenshots/comparisons/` — 1920×1080 browser captures and side-by-side visual comparisons.

## Standing implementation rules

1. Work only on the current numbered instruction.
2. Before changing an existing site, copy the current site files into a timestamped folder under `backups/`.
3. Check the exact Higgsfield model schema and preflight the cost before every generation.
4. Use an explicitly named model exactly; do not substitute it.
5. If a named image model remains queued for about ten minutes, switch image generation to `seedream_v5_pro` for the rest of that session and report the reason once.
6. Use 1920×1080 only as the browser screenshot viewport for visual comparison.
7. Build pages responsively with relative units; never set a fixed 1920×1080 page size.
8. Prevent horizontal scrolling at every supported viewport size.
9. Compare real page screenshots side by side with the designated website-design reference before reporting a visual match.

## Reference classification

`reference/devil-eye-product-v1.png` is the canonical website-design reference. Its source dimensions are 1024 × 1024; it controls visual direction, not the physical size of the responsive webpage.
