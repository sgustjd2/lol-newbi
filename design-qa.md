# Character card design QA

- source visual truth path: `C:\Users\admin\AppData\Local\Temp\codex-clipboard-73f61954-1544-4089-8163-80119afc30c3.png`
- implementation screenshot path: CUA in-app browser capture of `http://127.0.0.1:4173/?qa=character-card-v6#card/champion/Belveth` (inline browser evidence; the available browser capture API does not expose a filesystem path)
- source pixels: 767 × 1024
- implementation viewport: 1280 × 720 CSS px, browser device scale factor 1
- density normalization: no raster comparison; the source is a portrait collectible-card mock while the implementation is a responsive web card page, so content regions and hierarchy were compared at their rendered size
- state: 벨베스 캐릭터 카드 페이지, 공허 테마, desktop viewport, data loaded, no dialog open

## Comparison evidence

- Full view: the implementation keeps the source hierarchy of champion identity and portrait, plain-language skill tiles, counter picks, and recommended items inside a single collectible-style panel. It intentionally omits the source mock's numeric Attack/Defense/Ability Power/Difficulty block per the product request.
- Focused regions: the hero region, skill grid, counter grid, and compact item rows were inspected separately. Existing Data Dragon champion/item images are used rather than placeholders. Korean copy wraps inside grid cells without horizontal overflow.
- The card route hides the project's global header and footer, uses the generated frosted-glass texture asset, and changes accent/surface tokens by faction: Demacia, Noxus, Ionia, Freljord, Piltover, Zaun, Shurima, Targon, Bilgewater, Ixtal, Shadow Isles, Bandle City, Void, and Runeterra.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing site font stack and weight hierarchy are reused; large champion names, section headings, labels, and child-friendly body copy remain distinct and readable.
- Spacing and layout rhythm: the card has a framed hero, section dividers, consistent tile padding, and responsive single-column fallbacks. A shared `header` height rule initially caused hero content overlap; it was reset for `.character-card-hero` and the revised capture shows the sections separated correctly.
- Colors and visual tokens: each faction gets its own restrained accent pair and paper/glass surface while keeping the reference's cyan technical framing and readable black typography.
- Image quality and asset fidelity: champion portraits, skill icons, counter icons, and item icons come from the project's Data Dragon data and are rendered with object-fit/corner treatment.
- Copy and content: the card has no NotebookLM label, no numeric ability-stat block, and includes P plus Q/W/E/R. Nidalee was checked for human/cougar text and Jayce for hammer/cannon text; both retain their form-specific explanations.

## Primary interactions tested

- 173 champion cards render and each has one `캐릭터 카드 보기` button.
- The button opens `#card/champion/<id>` and hides the dictionary while showing the card page.
- The back button restores the champion list; the original champion detail button still opens its dialog.
- Card counts on the tested routes: 5 skill tiles, 3 counter tiles, and up to 5 representative item tiles.
- Nidalee, Jayce, Kayn, Elise, and other transformation-capable cards retain their form-specific explanations; Nidalee and Jayce were explicitly checked for human/cougar and hammer/cannon text.
- At 1280 × 720, the desktop card automatically scales only when a champion's copy is taller than the viewport. The 173 champion routes were checked: every card reaches its footer without page scrolling or clipping, with no horizontal overflow. Responsive CSS provides one-column layouts below 700px.
- Browser console: no warning or error entries were reported during the tested flow.

## Comparison history

1. Initial capture found the shared global `header` height/padding applied to the card's internal hero header, causing the subtitle/role area and `한눈에 보기` heading to overlap.
2. Reset `.character-card-hero` max-width, height, margin, and horizontal padding while keeping the intended card padding.
3. Reworked the route as a standalone frosted collectible card and removed the global site chrome from card mode.
4. Added the reusable frosted texture asset, fourteen faction themes, compact representative item rows, and automatic desktop viewport fitting.
5. Rechecked Garen, Bel'Veth, Nidalee, Jayce, Kayn, Gnar, and all 173 champion routes. No P0, P1, or P2 findings remain.

## Implementation checklist

- [x] Add a separate card-view button without nesting interactive buttons.
- [x] Render child-friendly summary, passive, Q/W/E/R, counters, and recommended items.
- [x] Preserve form-specific skill text for transformation champions.
- [x] Add back and print actions.
- [x] Add faction themes, responsive and print styles, and viewport fitting.
- [x] Validate the 173-champion source data set and browser interactions.

## Follow-up polish

- P3: A future art pass could add faction-specific ornamental motifs or logos. The current version already uses a reusable frosted texture asset and live champion/item assets while keeping the card readable at one viewport.

final result: passed
