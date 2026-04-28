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

function resetModal(confirm = true) {
  showModalCalls = [];
  nextModalConfirm = confirm;
}

function readDashboardWxml() {
  return fs.readFileSync(path.join(__dirname, '..', 'pages/dashboard/dashboard.wxml'), 'utf8');
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

const dashboardWxml = readDashboardWxml();
assert(
  !dashboardWxml.includes('i18n.stock_alert'),
  'dashboard should not render Stock Alert in the simplified UI'
);
assert(
  !dashboardWxml.includes('cal-grid') && !dashboardWxml.includes('weightCanvas') && !dashboardWxml.includes('monthlyStats'),
  'dashboard should not render calendar, weight chart, or monthly stats cards'
);
assert(
  dashboardWxml.includes('monthly-poster-card') && dashboardWxml.includes('openStatsRules'),
  'dashboard should render poster CTA and preview rule entry point'
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
  '愿你与它，每天都是好日子。',
  'poster footer should use fixed copy instead of note data'
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
