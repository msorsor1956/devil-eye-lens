# Forensic reference study

Canonical source: `reference/devil-eye-product-v1.png`  
Source dimensions: 1024 × 1024 px, square, opaque PNG  
Role: single source of truth for all generation prompts and layout decisions

## Inspection method

The source was divided into eight full-resolution inspection crops: all four quadrants, the iris/pupil, top mounting tab, right mounting ears, and lower lens/rim. Measurements below are normalized to the source canvas so they remain useful in a responsive layout. Crop files live in `analysis/crops/`.

## Composition and normalized geometry

- One product fills the frame on a full-bleed background. There is no visible container, border, margin, floor seam, or cast shadow.
- Full product bounds: approximately x 2.2%–98.1%, y 5.0%–93.0%.
- Main circular housing: x 2.8%–91.8%, y 5.0%–92.8%; center approximately 47.3% / 48.9%.
- The main housing is about 89% of the canvas width and 88% of its height. The product's visual weight is slightly left of center while the two mounting ears extend almost to the right edge.
- Red iris: x 35.4%–70.4%, y 25.4%–60.7%; center approximately 53.0% / 43.8%; diameter about 35% of the canvas.
- Black pupil: x 47.4%–59.2%, y 38.1%–49.8%; center approximately 53.3% / 44.0%; diameter about 11.8%.
- White sclera: a wide almond behind the iris, roughly x 20%–81%, y 24%–65%. Its lower edge forms a smooth white crescent, clearest from x 36%–67%, y 58%–65%.
- Top-left rear mounting tab: x 23%–37%, y 5%–13%.
- Upper-right mounting ear: x 81%–98%, y 21%–38%.
- Lower-right mounting ear: x 87%–97%, y 52%–70%.
- Product never touches the canvas edge; the upper-right ear comes within roughly 2%.

## Subject, pose, and camera

- A single black automotive LED devil-eye projector lamp, photographed almost straight-on.
- Slight high/front perspective is communicated by the thick upper rim, the dome curvature, and the visible rear tabs; it must not become a three-quarter product view.
- The iris is intentionally offset rightward and upward inside the housing rather than centered in the main circle.
- The circular housing is dense and tightly framed, with the upper-left bracket peeking from behind and two asymmetric right ears visible.
- There is no cable, strap, controller, remote, vehicle, packaging, second lamp, or secondary object.

## Mechanical details

- The outer housing is built from multiple concentric molded rings: a thick rounded exterior ring, a slimmer glossy ridge, and a deep inner black surround.
- Top tab is a rounded arch hidden behind the rim, with a circular recess near 27.5% / 8.6%; a narrow gray edge highlight follows its upper-left curve.
- Upper-right ear is broad, tapered, and triangular with a softly rounded tip; its bolt hole is centered near 94% / 31.2%.
- Lower-right ear is narrower and angles downward; its bolt hole is centered near 90.8% / 63.3%.
- Both right bolt holes are dark inside with narrow graphite/silver rims. The ear contours include subtle pressed ridges and thin edge glints.

## Eye and iris detail

- The white eye is a smooth, reflective sculpted diffuser. It narrows sharply at left and right and is partly occluded by the iris and black lower housing.
- The iris is a glassy red-orange optical structure, not a flat red disc. Hundreds of irregular radial filaments radiate from a thin hot-red ring around the pupil.
- The outer iris boundary is dark maroon. The brightest orange fibers collect in the lower center and lower-left quadrant.
- The upper-right iris quadrant contains darker folded, almost flame-like structures; the radial pattern is deliberately nonuniform.
- Several tiny bright flecks sit in the lower iris around x 49%–57%, y 55%–58%; a small amber fleck sits at the right edge.
- The pupil is a deep near-black glossy circle with no symbol or printed detail.

## Materials

- Housing and mounting ears: black injection-molded material, predominantly satin/semi-gloss with polished rim edges.
- Optical cover: clear, strongly convex dome with mirror-like studio reflections.
- Sclera: cool white glossy plastic or illuminated diffuser.
- Iris: translucent/glassy red-orange LED or optical texture with dimensional depth.
- Pupil: near-black glossy optical center.

## Reflections and highlight map

- Main top reflection: a large curved white trapezoid across x 34%–67%, y 15%–27%; broad at the top, slightly narrower/lower toward center, with soft gray falloff.
- Left reflection: four skewed white panes separated by a thick black cross, x 18%–31%, y 34%–50%. Convex distortion makes the panes lean inward and pulls the lower pair farther down.
- Right reflection: a narrower curved grid, x 72%–80%, y 33%–49%, with three prominent vertical white panes broken by dark horizontal gaps.
- Lower dome reflection: broad smoky-gray curved rectangle, x 31%–70%, y 61%–80%, strongest near lower center and softly diffused.
- A thin cool silver highlight traces the outer upper arc; faint glints mark the right ear edges and bolt-hole rims.
- Highlights are crisp on the top and side panes, softer toward the bottom of the lens.

## Background and sampled color

- Full-bleed brushed graphite/black metal with fine horizontal grain.
- Brightest across the upper middle/right; progressively darker downward with a subtle vignette. Grain remains visible at the exposed upper and right edges and nearly disappears at the bottom.
- Representative source samples:
  - top-left: rgb(23, 23, 21), approximately `#171715`
  - top-center: rgb(115, 115, 115), approximately `#737373`
  - top-right: rgb(83, 82, 85), approximately `#535255`
  - middle-left: rgb(20, 20, 20), approximately `#141414`
  - middle-right: rgb(48, 48, 48), approximately `#303030`
  - bottom-left: rgb(11, 11, 11), approximately `#0b0b0b`
  - bottom-center: rgb(8, 8, 8), approximately `#080808`
  - bottom-right: rgb(31, 31, 31), approximately `#1f1f1f`
- No horizon, environment, floor reflection, red spill, or atmospheric haze.

## Lighting and grade

- Soft overhead/front key from top-center, plus rectangular left and right studio sources visible only as dome reflections.
- Cool neutral whites and silver-gray highlights against deep charcoal and black.
- The iris is the sole saturated color: intense red-orange with internal luminosity but no glow spilling onto the background.
- High contrast, premium dark-tech automotive mood. Blacks remain deep while retaining the concentric ring contours.
- The color and contrast are part of the generated asset itself; no CSS filter should simulate the grade.

## Corner audit

- Top-left: dark horizontal brushed grain; the top mounting tab begins around 23% across.
- Top-right: unobstructed medium graphite until the upper-right ear enters around x 81%, y 21%.
- Bottom-left: near-black grain; the main rim curves away and ends around x 16%, y 86%.
- Bottom-right: near-black brushed metal; the product clears the corner and finishes around x 76%, y 93%.

## Text and interface audit

- No headline, navigation, button, label, micro-text, logo, watermark, or interface element.
- No text or symbols are printed on the product.
- Therefore the static page needs no HTML copy or controls in this phase.

## Generation constraints derived from the reference

- Recreate only the single projector lamp, at the exact frontal/slightly-high angle and normalized position above.
- Preserve the asymmetric mounting tabs, three visible bolt holes, dense concentric black rings, offset eye, sculpted white almond, organic red iris, and all four reflection zones.
- Remove every unrelated object and all typography.
- Use the reference's brushed graphite darkest tone as the clean empty background.
- Preserve the square 1:1 composition for the generated master. Any responsive crop must preserve geometry and may not stretch the circular housing.

## Responsive layout implication

- The approved square subject master should remain proportional (`aspect-ratio: 1 / 1`) and be cropped only by a responsive viewport container.
- Use full-viewport relative sizing, `object-fit: cover`, and tuned percentage object positioning for the 1920×1080 comparison; never set a fixed 1920 px page width or 1080 px page height.
- If direct cover cropping removes too much of the mechanical silhouette, use a generated matching graphite background plate behind a proportional square hero layer.
- Horizontal overflow must remain clipped and no animation is used in this phase.
