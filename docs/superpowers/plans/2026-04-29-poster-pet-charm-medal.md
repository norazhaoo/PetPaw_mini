# Poster Pet Charm Medal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monthly poster badge artwork with pet-tag medal drawings that look more like earned awards while preserving existing badge logic.

**Architecture:** Keep the change inside the dashboard poster canvas code. The badge data builder remains unchanged; only the visual config helper, badge drawing helper, and related tests move from sticker terminology to pet charm medal terminology.

**Tech Stack:** WeChat Mini Program page code, JavaScript canvas drawing primitives, Node `assert` tests run with `node tests/dashboard_actions.test.js`.

---

## File Structure

- Modify `tests/dashboard_actions.test.js`: update the poster badge contract tests from sticker configs to medal configs and keep the risky canvas API guard.
- Modify `pages/dashboard/dashboard.js`: replace sticker-specific config and drawing helpers with pet charm medal config and canvas drawing helpers.
- No new asset files. No changes to badge unlock logic, i18n copy, WXML, or WXSS.

## Task 1: Update The Badge Visual Contract Test

**Files:**
- Modify: `tests/dashboard_actions.test.js:482-506`
- Test: `tests/dashboard_actions.test.js`

- [ ] **Step 1: Write the failing medal config test**

Replace the existing sticker assertions in `tests/dashboard_actions.test.js` around the current `badgeStickerConfigs` block with this code:

```js
const badgeMedalConfigs = pageWithPosterStats._getPosterBadgeMedalConfig();
assert.strictEqual(badgeMedalConfigs.record.length, 4, 'poster should define four distinct record badge medals');
assert.strictEqual(badgeMedalConfigs.habit.length, 3, 'poster should define three distinct habit badge medals');

const allBadgeMedals = badgeMedalConfigs.record.concat(badgeMedalConfigs.habit);
assert.strictEqual(
  new Set(allBadgeMedals.map(config => config.tagShape)).size,
  7,
  'each poster badge should use a distinct pet-tag medal silhouette'
);
assert.strictEqual(
  new Set(allBadgeMedals.map(config => config.mark)).size,
  7,
  'each poster badge should use a distinct medal center mark'
);
assert(
  allBadgeMedals.every(config => !config.eventIconName),
  'poster badge medals should not reuse daily event icons'
);
assert(
  allBadgeMedals.every(config =>
    config.tagFill &&
    config.innerFill &&
    config.ringFill &&
    config.labelFill &&
    Array.isArray(config.ribbonColors) &&
    config.ribbonColors.length === 2 &&
    config.mark
  ),
  'poster badge medals should define finished tag, ribbon, inner plate, ring, label, and center mark layers'
);
const medalDrawingSource = dashboardJs.slice(
  dashboardJs.indexOf('_drawPosterMedalBadge'),
  dashboardJs.indexOf('// ─── Section 4: Supply Snapshot')
);
assert(
  !/shadowColor|shadowBlur|shadowOffsetY|globalAlpha|bezierCurveTo/.test(medalDrawingSource),
  'poster badge medal drawing should avoid Mini Program canvas APIs that can fail in the rendering layer'
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/dashboard_actions.test.js
```

Expected: FAIL with a message like `TypeError: pageWithPosterStats._getPosterBadgeMedalConfig is not a function`.

- [ ] **Step 3: Commit the failing test if working in strict TDD checkpoints**

Run only if the workflow is preserving red tests in separate commits:

```bash
git add tests/dashboard_actions.test.js
git commit -m "test: define poster medal badge contract"
```

Expected: commit succeeds and only `tests/dashboard_actions.test.js` is included.

## Task 2: Add Medal Configs And Wire The Monthly Badge Section

**Files:**
- Modify: `pages/dashboard/dashboard.js:1949-1994`
- Test: `tests/dashboard_actions.test.js`

- [ ] **Step 1: Replace the monthly badge section calls**

In `pages/dashboard/dashboard.js`, update `_drawMonthlyBadgeSection` so the config helper and drawing helper use medal names:

```js
  _drawMonthlyBadgeSection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, ACCENT, petLogs, petWeights, currentMonth, pet, startY, isZH, badgeDataOverride) {
    const badgeData = badgeDataOverride || this._buildMonthlyBadgeData(petLogs, petWeights, currentMonth, pet && pet.species);
    const configs = this._getPosterBadgeMedalConfig();
    const cardH = 430;
    const cardY = startY;
    this.drawCardSection(ctx, MARGIN, cardY, CARD_W, cardH, 32, CARD);

    const pillW = 104;
    ctx.fillStyle = 'rgba(254,225,64,0.32)';
    this.drawRoundedRectPath(ctx, W / 2 - pillW / 2, cardY + 28, pillW, 38, 19);
    ctx.fill();
    ctx.fillStyle = '#A56A00'; ctx.font = 'bold 20px -apple-system,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${badgeData.unlockedCount}/${badgeData.totalCount}`, W / 2, cardY + 54);

    const recordY = cardY + 120;
    const colW = CARD_W / 4;
    badgeData.recordBadges.forEach((badge, i) => {
      const cx = MARGIN + colW * i + colW / 2;
      this._drawPosterMedalBadge(ctx, cx, recordY, badge, configs.record[i], INK, MUTED);
    });

    const habitY = cardY + 306;
    const habitColW = CARD_W / 3;
    badgeData.habitBadges.forEach((badge, i) => {
      const cx = MARGIN + habitColW * i + habitColW / 2;
      this._drawPosterMedalBadge(ctx, cx, habitY, badge, configs.habit[i], INK, MUTED);
    });

    return cardY + cardH + 30;
  },
```

- [ ] **Step 2: Replace `_getPosterBadgeStickerConfig` with medal config**

Replace the old `_getPosterBadgeStickerConfig()` helper with:

```js
  _getPosterBadgeMedalConfig() {
    return {
      record: [
        { tagShape: 'soft-tag', mark: '3', tagFill: '#FFE6A7', stroke: '#D99320', innerFill: '#FFF8DE', ringFill: '#FFF1B8', labelFill: '#FFF6CE', markFill: '#8E5A0D', ribbonColors: ['#E96C62', '#4A96B8'], shine: [[-18, -30, 5], [-8, -35, 3]] },
        { tagShape: 'round-tag', mark: '7', tagFill: '#FFE1D6', stroke: '#DB7658', innerFill: '#FFF4EE', ringFill: '#FFD0BE', labelFill: '#FFF0E8', markFill: '#9F4D34', ribbonColors: ['#F48C64', '#6DA6D8'], shine: [[-20, -28, 4], [13, -35, 2.5]] },
        { tagShape: 'shield-tag', mark: '15', tagFill: '#D8F2F0', stroke: '#3F9E98', innerFill: '#F3FFFD', ringFill: '#BDEAE6', labelFill: '#EFFFFC', markFill: '#2E7772', ribbonColors: ['#43A79E', '#F2B84B'], shine: [[-17, -31, 4], [19, -25, 3]] },
        { tagShape: 'crest-tag', mark: '25', tagFill: '#E9E0FF', stroke: '#8067D7', innerFill: '#FAF7FF', ringFill: '#D6C9FF', labelFill: '#F4EEFF', markFill: '#5942AA', ribbonColors: ['#8B74E8', '#F08AA9'], shine: [[-19, -27, 4.5], [11, -36, 2.5]] }
      ],
      habit: [
        { tagShape: 'collar-tag', mark: '牙', tagFill: '#FFDDE9', stroke: '#CF5F8D', innerFill: '#FFF5F9', ringFill: '#FFC9DC', labelFill: '#FFF0F6', markFill: '#A4426F', ribbonColors: ['#E96F9A', '#66A7B8'], shine: [[-18, -29, 4], [17, -28, 3]] },
        { tagShape: 'drop-tag', mark: 'kg', tagFill: '#DCF1FF', stroke: '#4E9CCA', innerFill: '#F5FBFF', ringFill: '#BEE5FA', labelFill: '#ECF8FF', markFill: '#2F749B', ribbonColors: ['#59A6D0', '#8FC97A'], shine: [[-15, -32, 4], [20, -24, 2.5]] },
        { tagShape: 'home-tag', mark: '护', tagFill: '#E2F4D7', stroke: '#5B9F50', innerFill: '#F8FFF4', ringFill: '#C8EDB8', labelFill: '#F0FAEA', markFill: '#437D39', ribbonColors: ['#7DBF68', '#F2A65A'], shine: [[-19, -26, 4], [14, -34, 2.5]] }
      ]
    };
  },
```

- [ ] **Step 3: Run the test and observe the next failure**

Run:

```bash
node tests/dashboard_actions.test.js
```

Expected: FAIL with a message like `TypeError: this._drawPosterMedalBadge is not a function`, or a source-slice assertion failure until the drawing helper exists.

## Task 3: Implement The Pet Charm Medal Drawing Helper

**Files:**
- Modify: `pages/dashboard/dashboard.js:1996-2166`
- Test: `tests/dashboard_actions.test.js`

- [ ] **Step 1: Replace sticker drawing helpers with medal helpers**

Replace `_drawPosterStickerBadge`, `_drawPosterStickerShape`, and `_drawPosterStickerSymbol` with the following helpers:

```js
  _drawPosterMedalBadge(ctx, cx, cy, badge, config, INK, MUTED) {
    const unlocked = badge.unlocked;
    const tagFill = unlocked ? config.tagFill : '#F3F0EA';
    const stroke = unlocked ? config.stroke : '#CFC8BD';
    const innerFill = unlocked ? config.innerFill : '#FBFAF7';
    const ringFill = unlocked ? config.ringFill : '#ECE7DF';
    const labelFill = unlocked ? config.labelFill : '#F6F3EF';
    const markFill = unlocked ? config.markFill : '#9C9388';
    const ribbonColors = unlocked ? config.ribbonColors : ['#D6CEC3', '#C5BCB1'];
    const tagW = 82;
    const tagH = 92;

    ctx.save();

    ctx.fillStyle = 'rgba(80,60,30,0.08)';
    this._drawPosterMedalTagPath(ctx, config.tagShape, cx + 3, cy + 7, tagW + 8, tagH + 6);
    ctx.fill();

    this._drawPosterMedalRibbon(ctx, cx - 14, cy + 32, 26, 64, ribbonColors[0], -8);
    this._drawPosterMedalRibbon(ctx, cx + 14, cy + 32, 26, 64, ribbonColors[1], 8);

    ctx.fillStyle = '#FFFFFF';
    this._drawPosterMedalTagPath(ctx, config.tagShape, cx, cy, tagW + 12, tagH + 12);
    ctx.fill();

    ctx.fillStyle = tagFill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.2;
    this._drawPosterMedalTagPath(ctx, config.tagShape, cx, cy, tagW, tagH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ringFill;
    ctx.beginPath(); ctx.arc(cx, cy - 6, 29, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = unlocked ? this._colorWithAlpha(stroke, 0.38) : '#DDD7CE';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = innerFill;
    ctx.beginPath(); ctx.arc(cx, cy - 6, 21, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = unlocked ? this._colorWithAlpha(stroke, 0.8) : '#A69D91';
    ctx.beginPath(); ctx.arc(cx, cy - 43, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = unlocked ? '#FFF7DC' : '#F7F3ED';
    ctx.beginPath(); ctx.arc(cx, cy - 43, 2.3, 0, Math.PI * 2); ctx.fill();

    (config.shine || []).forEach(([dx, dy, r]) => {
      ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.46)';
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
    });

    this._drawPosterMedalMark(ctx, config.mark, cx, cy - 1, markFill);
    ctx.restore();

    ctx.font = 'bold 19px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    const title = badge.title.length > 5 ? badge.title.slice(0, 4) + '…' : badge.title;
    const labelW = 92;
    ctx.fillStyle = labelFill;
    this.drawRoundedRectPath(ctx, cx - labelW / 2, cy + 48, labelW, 28, 14);
    ctx.fill();
    ctx.fillStyle = unlocked ? INK : MUTED;
    ctx.fillText(title, cx, cy + 69);
    ctx.fillStyle = unlocked ? stroke : MUTED;
    ctx.font = 'bold 17px -apple-system,sans-serif';
    ctx.fillText(unlocked ? badge.shortLabel : badge.progressText, cx, cy + 94);
  },

  _drawPosterMedalRibbon(ctx, cx, y, w, h, fill, tilt) {
    const topY = y;
    const bottomY = y + h;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + tilt, topY);
    ctx.lineTo(cx + w / 2 + tilt, topY);
    ctx.lineTo(cx + w / 2, bottomY);
    ctx.lineTo(cx, bottomY - 14);
    ctx.lineTo(cx - w / 2, bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(cx - 4 + tilt * 0.5, topY + 6);
    ctx.lineTo(cx + 3 + tilt * 0.5, topY + 6);
    ctx.lineTo(cx, bottomY - 20);
    ctx.lineTo(cx - 6, bottomY - 6);
    ctx.closePath();
    ctx.fill();
  },

  _drawPosterMedalTagPath(ctx, shape, cx, cy, w, h) {
    if (shape === 'soft-tag') {
      this.drawRoundedRectPath(ctx, cx - w * 0.42, cy - h * 0.48, w * 0.84, h * 0.82, 28);
      ctx.lineTo(cx, cy + h * 0.52);
      ctx.closePath();
      return;
    }
    if (shape === 'round-tag') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.50);
      ctx.quadraticCurveTo(cx + w * 0.44, cy - h * 0.45, cx + w * 0.44, cy - h * 0.06);
      ctx.quadraticCurveTo(cx + w * 0.42, cy + h * 0.30, cx, cy + h * 0.52);
      ctx.quadraticCurveTo(cx - w * 0.42, cy + h * 0.30, cx - w * 0.44, cy - h * 0.06);
      ctx.quadraticCurveTo(cx - w * 0.44, cy - h * 0.45, cx, cy - h * 0.50);
      ctx.closePath();
      return;
    }
    if (shape === 'shield-tag') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.50);
      ctx.lineTo(cx + w * 0.42, cy - h * 0.22);
      ctx.lineTo(cx + w * 0.30, cy + h * 0.34);
      ctx.lineTo(cx, cy + h * 0.54);
      ctx.lineTo(cx - w * 0.30, cy + h * 0.34);
      ctx.lineTo(cx - w * 0.42, cy - h * 0.22);
      ctx.closePath();
      return;
    }
    if (shape === 'crest-tag') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.50);
      ctx.lineTo(cx + w * 0.38, cy - h * 0.32);
      ctx.lineTo(cx + w * 0.44, cy + h * 0.16);
      ctx.quadraticCurveTo(cx + w * 0.22, cy + h * 0.42, cx, cy + h * 0.54);
      ctx.quadraticCurveTo(cx - w * 0.22, cy + h * 0.42, cx - w * 0.44, cy + h * 0.16);
      ctx.lineTo(cx - w * 0.38, cy - h * 0.32);
      ctx.closePath();
      return;
    }
    if (shape === 'collar-tag') {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.34, cy - h * 0.48);
      ctx.lineTo(cx + w * 0.34, cy - h * 0.48);
      ctx.quadraticCurveTo(cx + w * 0.46, cy - h * 0.20, cx + w * 0.34, cy + h * 0.28);
      ctx.lineTo(cx, cy + h * 0.54);
      ctx.lineTo(cx - w * 0.34, cy + h * 0.28);
      ctx.quadraticCurveTo(cx - w * 0.46, cy - h * 0.20, cx - w * 0.34, cy - h * 0.48);
      ctx.closePath();
      return;
    }
    if (shape === 'drop-tag') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.52);
      ctx.quadraticCurveTo(cx + w * 0.50, cy - h * 0.08, cx, cy + h * 0.54);
      ctx.quadraticCurveTo(cx - w * 0.50, cy - h * 0.08, cx, cy - h * 0.52);
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.40, cy - h * 0.34);
    ctx.lineTo(cx, cy - h * 0.52);
    ctx.lineTo(cx + w * 0.40, cy - h * 0.34);
    ctx.lineTo(cx + w * 0.36, cy + h * 0.32);
    ctx.lineTo(cx, cy + h * 0.54);
    ctx.lineTo(cx - w * 0.36, cy + h * 0.32);
    ctx.closePath();
  },

  _drawPosterMedalMark(ctx, mark, cx, cy, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mark === '牙') {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 15);
      ctx.quadraticCurveTo(cx - 20, cy + 5, cx - 8, cy + 18);
      ctx.quadraticCurveTo(cx - 2, cy + 9, cx + 3, cy + 18);
      ctx.quadraticCurveTo(cx + 15, cy + 4, cx + 9, cy - 15);
      ctx.quadraticCurveTo(cx, cy - 9, cx - 10, cy - 15);
      ctx.fill();
      return;
    }
    if (mark === 'kg') {
      ctx.font = 'bold 16px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mark, cx, cy + 6);
      return;
    }
    if (mark === '护') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx + 17, cy - 8);
      ctx.lineTo(cx + 13, cy + 14);
      ctx.lineTo(cx, cy + 21);
      ctx.lineTo(cx - 13, cy + 14);
      ctx.lineTo(cx - 17, cy - 8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + 1, 5, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.font = mark.length > 1 ? 'bold 17px -apple-system,sans-serif' : 'bold 27px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mark, cx, cy + 8);
  },
```

- [ ] **Step 2: Run the test to verify it passes**

Run:

```bash
node tests/dashboard_actions.test.js
```

Expected: PASS and output includes `dashboard action tests passed`.

- [ ] **Step 3: Inspect the changed source for stale sticker references in the badge block**

Run:

```bash
rg -n "_getPosterBadgeStickerConfig|_drawPosterStickerBadge|_drawPosterStickerShape|_drawPosterStickerSymbol|badgeStickerConfigs|stickerDrawingSource" pages/dashboard/dashboard.js tests/dashboard_actions.test.js
```

Expected: no output.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add pages/dashboard/dashboard.js tests/dashboard_actions.test.js
git commit -m "Update poster badges to pet charm medals"
```

Expected: commit succeeds with only `pages/dashboard/dashboard.js` and `tests/dashboard_actions.test.js`.

## Task 4: Verify Scope And Final State

**Files:**
- Inspect: `docs/superpowers/specs/2026-04-29-poster-pet-charm-medal-design.md`
- Inspect: `pages/dashboard/dashboard.js`
- Inspect: `tests/dashboard_actions.test.js`

- [ ] **Step 1: Run the full local test command**

Run:

```bash
node tests/dashboard_actions.test.js
```

Expected: PASS and output includes `dashboard action tests passed`.

- [ ] **Step 2: Verify the spec requirements are covered**

Check these requirements manually against the diff:

```text
- Badge artwork is pet-tag medal style with tag body, inner plate, and two ribbons.
- Unlocked badges use warm/accent colors.
- Locked badges preserve silhouette and layers in muted warm gray.
- Seven badge variants remain distinct.
- No badge unlock logic, names, or targets changed.
- No new image assets were added.
- Risky canvas APIs remain absent from the badge drawing source.
```

Expected: every line is satisfied by `pages/dashboard/dashboard.js` and `tests/dashboard_actions.test.js`.

- [ ] **Step 3: Review git status**

Run:

```bash
git status --short
```

Expected: only intentional changes remain. The local `.superpowers/` visual companion directory may still appear as untracked unless it has been ignored or removed outside the implementation commits.

- [ ] **Step 4: Report completion with evidence**

Include:

```text
Implemented pet charm medal poster badges.
Verification: node tests/dashboard_actions.test.js -> dashboard action tests passed.
Remaining local note: .superpowers/ is an untracked visual companion directory if still present.
```
