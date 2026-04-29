# Poster Round Gold Medal Design

## Context

The monthly care poster currently draws the badge area with sticker-like shapes. The result is more polished than a plain icon, but it still reads as a decorative sticker rather than a medal. The badge section should feel like a set of earned awards while staying friendly to the PetPaw visual tone.

## Approved Direction

Use the simplified round gold medal direction:

- Each badge becomes a small medal built from a round gold coin, inner award plate, and two short ribbon tails.
- The round coin keeps the object clearly recognizable as a medal at small poster size.
- Unlocked badges use warm metal colors and per-badge accent palettes.
- Locked badges keep the same round silhouette and layers, but shift to muted warm gray tones.

## Goals

- Make each monthly badge clearly recognizable as a medal at poster size.
- Preserve seven distinct badge variants: four record badges and three habit badges.
- Keep the design implemented in canvas drawing code, with no new image assets.
- Keep labels and progress text readable within the existing monthly badge card layout.
- Avoid Mini Program canvas APIs already flagged as risky in tests.

## Non-Goals

- Do not redesign the full monthly poster layout.
- Do not change badge unlock logic, badge names, or progress targets.
- Do not add remote assets, bitmap exports, or new icon files.
- Do not change the dashboard runtime UI outside the exported poster artwork.

## Visual System

Each badge uses these layers:

1. Soft contact shadow drawn with translucent filled paths.
2. Two short ribbon tails behind the coin, using two accent colors.
3. White outer rim to separate the medal from the poster card.
4. Gold ring and coin body.
5. Inner metal plate for the award mark.
6. Center symbol or numeral that varies by badge.
7. Rounded label capsule below the medal.
8. Short unlocked label or locked progress text below the capsule.

Record badges should lean on day-count numerals or simple milestone symbols. Habit badges should use pet-care symbols that are not reused from daily event icons.

## Implementation Shape

Update the poster badge drawing code in `pages/dashboard/dashboard.js` around the existing monthly badge helpers.

- Keep `_buildMonthlyBadgeData` behavior unchanged.
- Replace the sticker-specific visual config with medal-oriented config fields while keeping a helper that returns four record configs and three habit configs.
- Update `_drawPosterStickerBadge` or rename it to a medal-specific helper if the local call sites and tests are updated together.
- Reuse existing path helpers such as rounded rectangles, stars, and simple quadratic paths.
- Use only safe canvas primitives already used elsewhere in the file: `beginPath`, `moveTo`, `lineTo`, `quadraticCurveTo`, `arc`, `fill`, `stroke`, and text drawing.

## Testing

Update `tests/dashboard_actions.test.js` to verify the new medal contract:

- Four record medal configs and three habit medal configs exist.
- All medals use the same clean round-gold silhouette.
- Each medal keeps a distinct center mark.
- Medal configs do not reuse daily event icon names.
- Configs define finished medal layers such as coin fill, ring fill, inner fill, ribbon colors, label fill, and center mark.
- Drawing source still avoids risky canvas APIs covered by the existing poster test.

Run the dashboard action test after implementation.
