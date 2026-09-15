# Character card design QA

- source visual truth path: `C:\Users\admin\AppData\Local\Temp\codex-clipboard-73f61954-1544-4089-8163-80119afc30c3.png`
- implementation screenshot path: CUA in-app browser capture of `http://127.0.0.1:4173/?qa=character-card-v1#card/champion/Ahri` (inline browser evidence; the available browser capture API does not expose a filesystem path)
- source pixels: 767 × 1024
- implementation viewport: 1265 × 710 CSS px, browser device scale factor 1
- density normalization: no raster comparison; the source is a portrait collectible-card mock while the implementation is a responsive web card page, so content regions and hierarchy were compared at their rendered size
- state: 아리 캐릭터 카드 페이지, desktop viewport, data loaded, no dialog open

## Comparison evidence

- Full view: the implementation keeps the source hierarchy of champion identity and portrait, plain-language skill tiles, counter picks, and recommended items inside a single collectible-style panel. It intentionally omits the source mock's numeric Attack/Defense/Ability Power/Difficulty block per the product request.
- Focused regions: the hero region, skill grid, counter grid, and item rows were inspected separately. Existing Data Dragon champion/item images are used rather than placeholders. Korean copy wraps inside grid cells without horizontal overflow.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing site font stack and weight hierarchy are reused; large champion names, section headings, labels, and child-friendly body copy remain distinct and readable.
- Spacing and layout rhythm: the card has a framed hero, section dividers, consistent tile padding, and responsive single-column fallbacks. A shared `header` height rule initially caused hero content overlap; it was reset for `.character-card-hero` and the revised capture shows the sections separated correctly.
- Colors and visual tokens: the existing navy, cyan, gold, pale-blue, and pale-cream palette carries the reference's collectible feel without changing the site's visual language.
- Image quality and asset fidelity: champion portraits, skill icons, counter icons, and item icons come from the project's Data Dragon data and are rendered with object-fit/corner treatment.
- Copy and content: the card has no NotebookLM label, no numeric ability-stat block, and includes P plus Q/W/E/R. Nidalee was checked for human/cougar text and Jayce for hammer/cannon text; both retain their form-specific explanations.

## Primary interactions tested

- 173 champion cards render and each has one `캐릭터 카드 보기` button.
- The button opens `#card/champion/<id>` and hides the dictionary while showing the card page.
- The back button restores the champion list; the original champion detail button still opens its dialog.
- Card counts on the Ahri route: 5 skill tiles, 3 counter tiles, and 18 item tiles.
- Nidalee and Jayce card routes retain their special form explanations.
- The card has no horizontal overflow in the rendered desktop state; responsive CSS provides one-column layouts below 700px.
- Browser console: no warning or error entries were reported during the tested flow.

## Comparison history

1. Initial capture found the shared global `header` height/padding applied to the card's internal hero header, causing the subtitle/role area and `한눈에 보기` heading to overlap.
2. Reset `.character-card-hero` max-width, height, margin, and horizontal padding while keeping the intended card padding.
3. Revised capture showed the hero, quick-summary cards, skill section, counter section, and item section separated with no horizontal overflow. The finding is closed.

## Implementation checklist

- [x] Add a separate card-view button without nesting interactive buttons.
- [x] Render child-friendly summary, passive, Q/W/E/R, counters, and recommended items.
- [x] Preserve form-specific skill text for transformation champions.
- [x] Add back and print actions.
- [x] Add responsive and print styles.
- [x] Validate the 173-champion source data set and browser interactions.

## Follow-up polish

- P3: If a future art pass is desired, add a real reusable card background asset matching the attached collectible mock more closely. The current version intentionally uses the existing site's lightweight CSS theme and live champion/item assets.

final result: passed

