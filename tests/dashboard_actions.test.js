const assert = require('assert');
const fs = require('fs');
const path = require('path');

let state;
let capturedPage;
let showModalCalls = [];
let nextModalConfirm = true;
let exportCalled = false;

global.wx = {
  getStorageSync() {
    return null;
  },
  setStorage() {},
  showModal(options) {
    showModalCalls.push(options);
    if (options && typeof options.success === 'function') {
      options.success({ confirm: nextModalConfirm });
    }
  },
  switchTab() {},
  setNavigationBarTitle() {},
  showToast() {},
  vibrateShort() {},
  getSystemInfoSync() {
    return { windowWidth: 375 };
  }
};

global.getApp = () => ({
  getState() {
    return state;
  },
  setState(nextState) {
    state = nextState;
  }
});

global.Page = (definition) => {
  capturedPage = definition;
};

require('../pages/dashboard/dashboard');

function createPage() {
  return {
    ...capturedPage,
    data: JSON.parse(JSON.stringify(capturedPage.data)),
    setData(update) {
      Object.assign(this.data, update);
    },
    getTabBar() {
      return null;
    }
  };
}

function createState() {
  return {
    activePetId: 'pet-1',
    pets: [{
      id: 'pet-1',
      name: 'NaiTang',
      species: 'dog',
      breed: 'Corgi',
      birthday: '2026-04-01T00:00:00.000Z',
      hiddenActions: ['vaccine']
    }],
    inventoryItems: [],
    logs: [],
    reminders: [],
    weightHistory: [],
    medicalRecords: [],
    customActions: [{ id: 'custom-1', petId: 'pet-1', label: 'Bath', color: '#5DADE2', iconIdx: 6 }]
  };
}

function actionEvent(dataset) {
  return { currentTarget: { dataset } };
}

function at(day, hour = 12, month = 3, year = 2026) {
  return new Date(year, month, day, hour, 0, 0).toISOString();
}

function ymd(dateLike) {
  const date = new Date(dateLike);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function resetModal(confirm = true) {
  showModalCalls = [];
  nextModalConfirm = confirm;
}

function readDashboardWxml() {
  return fs.readFileSync(path.join(__dirname, '..', 'pages/dashboard/dashboard.wxml'), 'utf8');
}

function readDashboardWxss() {
  return fs.readFileSync(path.join(__dirname, '..', 'pages/dashboard/dashboard.wxss'), 'utf8');
}

function readDashboardJs() {
  return fs.readFileSync(path.join(__dirname, '..', 'pages/dashboard/dashboard.js'), 'utf8');
}

state = createState();
const pageWithI18n = createPage();
pageWithI18n.onLoad();
assert.strictEqual(
  pageWithI18n.data.i18n.today_check_in,
  '今天记什么',
  'dashboard should load the new quick-record heading'
);
assert.strictEqual(
  pageWithI18n.data.i18n.monthly_care_poster,
  '本月照护海报',
  'dashboard should load the poster CTA copy'
);
assert.strictEqual(
  pageWithI18n.data.i18n.stats_rules,
  '统计说明',
  'poster preview should load rule explainer copy'
);
assert.strictEqual(
  pageWithI18n.data.i18n.stock_alert,
  '库存警报',
  'dashboard should load stock alert copy'
);
assert.strictEqual(
  pageWithI18n.data.exportCanvasVisible,
  false,
  'export canvas should not be mounted before poster generation starts'
);

const dashboardWxml = readDashboardWxml();
const dashboardJs = readDashboardJs();
const dashboardWxss = readDashboardWxss();
assert(
  dashboardWxml.includes('i18n.stock_alert'),
  'dashboard should render Stock Alert above the daily record area'
);
assert(
  dashboardWxml.includes('cal-grid') &&
    dashboardWxml.includes('prevMonth') &&
    dashboardWxml.includes('nextMonth') &&
    dashboardWxml.includes('selectDate') &&
    dashboardWxml.includes('goToday'),
  'dashboard should restore the calendar controls for backdated records'
);
assert(
  !dashboardWxml.includes('weightCanvas') && !dashboardWxml.includes('monthlyStats'),
  'dashboard should not render the old weight chart or monthly stats cards'
);
assert(
  dashboardWxml.includes('monthly-poster-card') && dashboardWxml.includes('openStatsRules'),
  'dashboard should render poster CTA and preview rule entry point'
);
assert(
  dashboardWxml.includes('wx:if="{{exportCanvasVisible}}"') &&
    dashboardWxml.includes('width:1px;height:1px;') &&
    !dashboardWxml.includes('left:-99999px') &&
    dashboardJs.includes('exportCanvasVisible: true') &&
    dashboardJs.includes('exportCanvasVisible: false'),
  'poster export canvas should mount as a tiny temporary node to avoid render-layer canvas updates'
);
assert(
  dashboardJs.includes('wx.createOffscreenCanvas') &&
    dashboardJs.includes('getFileSystemManager') &&
    dashboardJs.includes('toDataURL'),
  'poster export should prefer offscreen canvas so normal generation does not touch the render-layer canvas'
);
assert(
  dashboardWxss.includes('flex-wrap: nowrap') && dashboardWxss.includes('margin-left: -6rpx'),
  'calendar record icons should use a compact single-row overlap instead of vertical stacking'
);
assert(
  dashboardWxml.includes('width:16rpx;height:16rpx'),
  'calendar record icon images should be small enough for compact calendar cells'
);
assert(
  !dashboardJs.includes("cursorY = this._drawPosterHeatmapSection(ctx"),
  'poster should merge check-in distribution into the highlights card instead of drawing a standalone heatmap section'
);
assert(
  !dashboardJs.includes("${posterStats.monthLabel} ${t('monthly_care_poster')}"),
  'poster hero should show only the month instead of repeating the poster CTA title'
);
assert(
  !dashboardJs.includes("getLanguage() === 'zh' ? '本月亮点'") &&
    !dashboardJs.includes("t('care_changes') || 'Care Changes'") &&
    !dashboardJs.includes("t('weight_trend') || 'Weight Trend'") &&
    !dashboardJs.includes('Monthly Badges'),
  'poster should not draw external section headings above cards'
);

state = createState();
state.inventoryItems = [
  {
    id: 'food-1',
    petId: 'pet-1',
    typeId: 'food',
    label: 'Food',
    current: 500,
    consumptionAmount: 50,
    consumptionInterval: 1,
    consumptionTimeUnit: 'day',
    consumptionUnit: 'g',
    unit: 'g',
    hidden: false,
    iconName: 'FoodBowl'
  },
  {
    id: 'hidden-food',
    petId: 'pet-1',
    typeId: 'food',
    label: 'Hidden Food',
    current: 10,
    consumptionAmount: 10,
    consumptionInterval: 1,
    consumptionTimeUnit: 'day',
    consumptionUnit: 'g',
    unit: 'g',
    hidden: true
  },
  {
    id: 'other-pet-food',
    petId: 'pet-2',
    typeId: 'food',
    label: 'Other Food',
    current: 10,
    consumptionAmount: 10,
    consumptionInterval: 1,
    consumptionTimeUnit: 'day',
    consumptionUnit: 'g',
    unit: 'g',
    hidden: false
  }
];
const pageWithStockAlert = createPage();
pageWithStockAlert.onLoad();
pageWithStockAlert.refreshData();
assert.deepStrictEqual(
  pageWithStockAlert.data.inventoryItems.map(item => [item.id, item.daysLeft, item.isLow, item.shortLabel]),
  [['food-1', 10, false, '主粮']],
  'stock alert should show visible active-pet inventory with computed days left'
);
assert.deepStrictEqual(
  pageWithStockAlert.data.stockActionItems.map(item => item.actionKey),
  pageWithStockAlert.data.trackActions.map(item => item.actionKey),
  'stock alert should include every visible daily tracking action'
);

state = createState();
state.logs = [
  { id: 'today-log', petId: 'pet-1', type: 'deworming', date: at(26, 9) },
  { id: 'old-log', petId: 'pet-1', type: 'brush_teeth', date: at(25, 9) }
];
state.weightHistory = [
  { id: 'today-weight', petId: 'pet-1', date: at(26, 20), weight: 4.2 },
  { id: 'old-weight', petId: 'pet-1', date: at(24, 20), weight: 4.1 }
];
const pageWithTodayLogs = createPage();
const todayLogs = pageWithTodayLogs._buildTodayLogs(
  state.logs.filter(log => log.petId === 'pet-1'),
  state.weightHistory.filter(weight => weight.petId === 'pet-1'),
  state.customActions,
  new Date(2026, 3, 26, 12)
);
assert.deepStrictEqual(
  todayLogs.combinedLogs.map(item => item.id),
  ['today-weight', 'today-log'],
  'today logs should include only records from the current day, newest first'
);
assert.strictEqual(
  todayLogs.listTitle,
  '今日记录',
  'dashboard record list should always be titled Today Logs'
);

state = createState();
const pageWithTrackTap = createPage();
pageWithTrackTap.setData({ selectedDate: new Date(2026, 3, 26, 0) });
pageWithTrackTap.handleTrackAction(actionEvent({
  source: 'track',
  kind: 'builtin',
  type: 'deworming',
  label: 'Deworming',
  color: '#93C653'
}));
pageWithTrackTap.handleTrackAction(actionEvent({
  source: 'track',
  kind: 'custom',
  id: 'custom-1',
  label: 'Bath',
  color: '#5DADE2',
  iconidx: 0
}));
assert.deepStrictEqual(
  state.logs.map(log => log.type).sort(),
  ['custom_custom-1', 'deworming'],
  'tapping Things to Track events should still create daily records'
);

state = createState();
const backfillDate = new Date(2026, 3, 25, 0);
const pageWithBackfilledBuiltin = createPage();
pageWithBackfilledBuiltin.onLoad();
pageWithBackfilledBuiltin.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1)
});
pageWithBackfilledBuiltin.handleTrackAction(actionEvent({
  source: 'track',
  kind: 'builtin',
  type: 'deworming',
  label: 'Deworming',
  color: '#93C653'
}));
assert.strictEqual(
  ymd(state.logs[0].date),
  '2026-04-25',
  'built-in daily records should use the selected calendar date'
);
assert.strictEqual(
  ymd(pageWithBackfilledBuiltin.data.selectedDate),
  '2026-04-25',
  'refresh after logging should keep the selected calendar date'
);
assert(
  pageWithBackfilledBuiltin.data.daysInMonth.find(item => item.dateStr === '2026-04-25').icons.some(item => item.name === 'deworming'),
  'calendar day should show an icon after logging a selected-date record'
);

state = createState();
const pageWithBackfilledCustom = createPage();
pageWithBackfilledCustom.onLoad();
pageWithBackfilledCustom.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1)
});
pageWithBackfilledCustom.handleTrackAction(actionEvent({
  source: 'track',
  kind: 'custom',
  id: 'custom-1',
  label: 'Bath',
  color: '#5DADE2',
  iconidx: 6
}));
assert.strictEqual(
  ymd(state.logs[0].date),
  '2026-04-25',
  'custom daily records should use the selected calendar date'
);

state = createState();
const pageWithBackfilledWeight = createPage();
pageWithBackfilledWeight.onLoad();
pageWithBackfilledWeight.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1),
  newWeight: 4.6
});
pageWithBackfilledWeight.saveWeight();
assert.strictEqual(
  ymd(state.weightHistory[0].date),
  '2026-04-25',
  'weight records should use the selected calendar date'
);

state = createState();
state.logs = [
  { id: 'selected-log', petId: 'pet-1', type: 'deworming', date: at(25, 9) },
  { id: 'today-log', petId: 'pet-1', type: 'brush_teeth', date: at(26, 9) }
];
const pageWithSelectedDateRefresh = createPage();
pageWithSelectedDateRefresh.onLoad();
pageWithSelectedDateRefresh.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1)
});
pageWithSelectedDateRefresh._computeHeavyData(state, state.pets[0], true);
assert.deepStrictEqual(
  pageWithSelectedDateRefresh.data.combinedLogs.map(item => item.id),
  ['selected-log'],
  'heavy data refresh should keep showing records for the selected calendar date'
);
assert.strictEqual(
  pageWithSelectedDateRefresh.data.listTitle,
  '记录: 4月25日',
  'selected-date record list should use the non-today title'
);

state = createState();
const pageWithPastEmptyDate = createPage();
pageWithPastEmptyDate.onLoad();
pageWithPastEmptyDate.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1)
});
pageWithPastEmptyDate._computeHeavyData(state, state.pets[0], true);
assert.strictEqual(
  pageWithPastEmptyDate.data.emptyLogText,
  '当日无记录。',
  'empty selected-date records should use the non-today empty text'
);

state = createState();
const posterDate = new Date(2026, 3, 27, 12);
state.logs = [
  { id: 'brush-1', petId: 'pet-1', type: 'brush_teeth', date: at(1, 9) },
  { id: 'brush-2', petId: 'pet-1', type: 'brush_teeth', date: at(2, 9) },
  { id: 'brush-prev', petId: 'pet-1', type: 'brush_teeth', date: at(1, 9, 2) },
  { id: 'walk-1', petId: 'pet-1', type: 'walk_dog', date: at(2, 18) },
  { id: 'walk-2', petId: 'pet-1', type: 'walk_dog', date: at(3, 18) },
  { id: 'walk-3', petId: 'pet-1', type: 'walk_dog', date: at(4, 18) },
  { id: 'hidden-vaccine', petId: 'pet-1', type: 'vaccine', date: at(5, 12) },
  { id: 'custom-live', petId: 'pet-1', type: 'custom_custom-1', date: at(6, 12), color: '#5DADE2', iconIdx: 6 },
  { id: 'custom-deleted', petId: 'pet-1', type: 'custom_deleted', date: at(7, 12), color: '#000000', iconIdx: 0 }
];
state.weightHistory = [
  { id: 'weight-1', petId: 'pet-1', date: at(8, 20), weight: 4.1 },
  { id: 'weight-2', petId: 'pet-1', date: at(20, 20), weight: 4.4 }
];
state.medicalRecords = [
  { id: 'med-1', petId: 'pet-1', date: at(9, 11), tags: ['fever'] }
];
const pageWithPosterStats = createPage();
const posterStats = pageWithPosterStats._buildPosterStats(state, state.pets[0], posterDate);
assert.strictEqual(
  pageWithPosterStats._formatPosterMonthLabel(posterDate),
  '四月',
  'poster hero month should use the lightweight Chinese month label'
);
assert.strictEqual(
  posterStats.overview.find(item => item.key === 'companion_days').value,
  27,
  'poster companion days should be calculated from birthday while keeping the label'
);
assert.strictEqual(
  posterStats.overview.find(item => item.key === 'monthly_records').value,
  10,
  'poster monthly records should include logs, weight records, and medical records'
);
assert.strictEqual(
  posterStats.overview.find(item => item.key === 'active_days').value,
  9,
  'poster active days should count natural days with at least one effective record'
);
assert.deepStrictEqual(
  posterStats.careChanges.map(item => item.type),
  ['walk_dog', 'brush_teeth', 'medical', 'custom_custom-1'],
  'care changes should use dynamic top non-weight visible items only'
);
assert.strictEqual(
  posterStats.careChanges.find(item => item.type === 'brush_teeth').delta,
  1,
  'care changes should compare against the same range in the previous month'
);
assert(
  !posterStats.careChanges.some(item => item.type === 'log_weight' || item.type === 'vaccine' || item.type === 'custom_deleted'),
  'care changes should exclude weight, hidden built-ins, and deleted custom actions'
);
assert.deepStrictEqual(
  [posterStats.weightTrend.status, posterStats.weightTrend.delta],
  ['line', 0.3],
  'weight trend should be the only place that exposes weight change'
);
assert.deepStrictEqual(
  posterStats.badges.recordBadges.map(badge => badge.title),
  ['小小开始', '稳定一周', '半月陪伴', '满满一月'],
  'record badge names should be clear and meaningful'
);
assert.strictEqual(
  posterStats.footerQuote,
  '谢谢你陪我度过的每一天。',
  'poster footer should use the updated companionship copy'
);

const badgeMedalConfigs = pageWithPosterStats._getPosterBadgeMedalConfig();
assert.strictEqual(badgeMedalConfigs.record.length, 4, 'poster should define four distinct record badge medals');
assert.strictEqual(badgeMedalConfigs.habit.length, 3, 'poster should define three distinct habit badge medals');

const allBadgeMedals = badgeMedalConfigs.record.concat(badgeMedalConfigs.habit);
assert.strictEqual(
  typeof pageWithPosterStats._drawPosterMedalBadge,
  'function',
  'poster should expose the medal badge drawing helper used by monthly badge export'
);
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

state = createState();
delete state.pets[0].birthday;
state.logs = [
  { id: 'no-birthday-log', petId: 'pet-1', type: 'brush_teeth', date: at(2, 9) }
];
const noBirthdayStats = createPage()._buildPosterStats(state, state.pets[0], posterDate);
assert.deepStrictEqual(
  noBirthdayStats.overview.map(item => item.key),
  ['monthly_records', 'active_days', 'top_record'],
  'poster overview should replace companion days with top record when birthday is missing'
);

state = createState();
state.pets[0].hiddenActions = ['vaccine', 'deworming', 'brush_teeth', 'walk_dog', 'log_weight'];
state.customActions = [];
state.logs = [
  { id: 'hidden-1', petId: 'pet-1', type: 'brush_teeth', date: at(1, 9) },
  { id: 'hidden-2', petId: 'pet-1', type: 'walk_dog', date: at(2, 9) }
];
const emptyCareStats = createPage()._buildPosterStats(state, state.pets[0], posterDate);
assert.strictEqual(
  emptyCareStats.careChanges.length,
  0,
  'care changes should be empty if every recorded item has been hidden or deleted'
);
assert.strictEqual(
  emptyCareStats.careChangesEmptyText,
  '本月还没有足够记录',
  'care changes should expose a friendly empty state'
);

state = createState();
const noWeightStats = createPage()._buildPosterStats(state, state.pets[0], posterDate);
assert.strictEqual(noWeightStats.weightTrend.status, 'hidden', 'weight trend should hide with no weight data');
state.weightHistory = [{ id: 'one-weight', petId: 'pet-1', date: at(10, 20), weight: 4.2 }];
const singleWeightStats = createPage()._buildPosterStats(state, state.pets[0], posterDate);
assert.strictEqual(singleWeightStats.weightTrend.status, 'single', 'weight trend should show a single-point state for one weight');

state = createState();
const pageWithRules = createPage();
pageWithRules.openStatsRules();
assert.strictEqual(pageWithRules.data.showStatsRules, true, 'stats rule entry should open the explainer modal');
pageWithRules.closeStatsRules();
assert.strictEqual(pageWithRules.data.showStatsRules, false, 'stats rule modal should close');

console.log('dashboard action tests passed');
