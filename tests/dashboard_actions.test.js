const assert = require('assert');

let state;
let capturedPage;

global.wx = {
  getStorageSync() {
    return null;
  },
  setStorage() {},
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
    },
    _computeHeavyData() {}
  };
}

function createState() {
  return {
    activePetId: 'pet-1',
    pets: [{ id: 'pet-1', species: 'dog', hiddenActions: ['vaccine'] }],
    inventoryItems: [],
    logs: [],
    reminders: [],
    weightHistory: [],
    medicalRecords: [],
    customActions: [{ id: 'custom-1', petId: 'pet-1', label: 'Bath', color: '#5DADE2', iconIdx: 0 }]
  };
}

function actionEvent(dataset) {
  return { currentTarget: { dataset } };
}

function sameMonthDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

state = createState();
const pageWithCustomPlaceholder = createPage();
pageWithCustomPlaceholder.onLoad();
assert.strictEqual(
  pageWithCustomPlaceholder.data.i18n.custom_event_placeholder,
  '例如：洗澡时间',
  'custom event placeholder should be loaded from i18n'
);

state = createState();
const reportDate = sameMonthDate();
state.logs = [
  { id: 'report-log-1', petId: 'pet-1', type: 'deworming', date: reportDate.toISOString() },
  { id: 'report-log-2', petId: 'pet-1', type: 'deworming', date: reportDate.toISOString() },
  { id: 'report-log-3', petId: 'pet-1', type: 'custom_missing', date: reportDate.toISOString() }
];
const pageWithReportActivity = createPage();
const reportActivity = pageWithReportActivity._buildReportActivityData(
  state.logs,
  new Date(reportDate.getFullYear(), reportDate.getMonth(), 1)
);
assert.strictEqual(
  reportActivity.totalCount,
  2,
  'export report activity should not count deleted custom events'
);
assert(
  !reportActivity.stats.some((item) => item.label === 'Custom' || item.label === '自定义'),
  'export report activity should not show a generic Custom item'
);
assert.strictEqual(
  reportActivity.stats.find((item) => item.type === 'deworming').color,
  'rgba(254,225,64,0.51)',
  'export report activity stat color should use heatmap intensity logic'
);

state = createState();
const pageWithHiddenAction = createPage();
pageWithHiddenAction.setData({ isEditingActions: true });
pageWithHiddenAction.refreshData();
assert(
  !pageWithHiddenAction.data.quickActions.some((item) => item.type === 'vaccine'),
  'hidden quick actions should be removed from Things to Track while editing'
);

state = createState();
const pageWithStockActions = createPage();
pageWithStockActions.refreshData();
assert.deepStrictEqual(
  pageWithStockActions.data.stockActionItems.map((item) => item.actionKey),
  pageWithStockActions.data.trackActions.map((item) => item.actionKey),
  'Stock Alert should include every visible Things to Track event'
);

state = createState();
state.logs = [
  { id: 'log-1', petId: 'pet-1', type: 'deworming', date: new Date().toISOString() },
  { id: 'log-2', petId: 'pet-1', type: 'custom_custom-1', date: new Date().toISOString(), color: '#5DADE2', iconIdx: 0 }
];
const pageWithRecentStockActions = createPage();
pageWithRecentStockActions.refreshData();
assert.strictEqual(
  pageWithRecentStockActions.data.stockActionItems.find((item) => item.type === 'deworming').lastActionText,
  '刚刚',
  'built-in Stock Alert event should show its latest log time'
);
assert.strictEqual(
  pageWithRecentStockActions.data.stockActionItems.find((item) => item.id === 'custom-1').lastActionText,
  '刚刚',
  'custom Stock Alert event should show its latest log time'
);

state = createState();
const colorDate = sameMonthDate();
state.logs = [
  { id: 'log-color-1', petId: 'pet-1', type: 'deworming', date: colorDate.toISOString(), color: '#000000' },
  { id: 'log-color-2', petId: 'pet-1', type: 'custom_custom-1', date: colorDate.toISOString(), color: '#000000', iconIdx: 0 }
];
state.weightHistory = [
  { id: 'weight-color-1', petId: 'pet-1', date: colorDate.toISOString(), weight: 4.2 }
];
const pageWithUnifiedColors = createPage();
pageWithUnifiedColors.setData({
  i18n: { months: [] }
});
const calendarColors = pageWithUnifiedColors._buildCalendar(
  state,
  new Date(colorDate.getFullYear(), colorDate.getMonth(), 1),
  colorDate,
  true
);
const recordedDay = calendarColors.daysInMonth.find((item) => item.dateStr === `${colorDate.getFullYear()}-${String(colorDate.getMonth() + 1).padStart(2, '0')}-${String(colorDate.getDate()).padStart(2, '0')}`);
assert.strictEqual(
  recordedDay.icons.find((item) => item.name === 'deworming').color,
  '#93C653',
  'recorded calendar icons for built-in events should use Things to Track icon color'
);
assert.strictEqual(
  recordedDay.icons.find((item) => item.name === 'Star').color,
  '#5DADE2',
  'recorded calendar icons for custom events should use Things to Track icon color'
);
assert.strictEqual(
  recordedDay.icons.find((item) => item.name === 'scale').color,
  '#6C8EBF',
  'recorded calendar icons for weight should use Things to Track weight color'
);
assert.strictEqual(
  calendarColors.monthlyStats.find((item) => item.type === 'deworming').color,
  '#93C653',
  'monthly stats for built-in events should use Things to Track icon color'
);
assert.strictEqual(
  calendarColors.monthlyStats.find((item) => item.type === 'custom_custom-1').color,
  '#5DADE2',
  'monthly stats for custom events should use Things to Track icon color'
);
assert.strictEqual(
  calendarColors.monthlyStats.find((item) => item.type === 'log_weight').color,
  '#6C8EBF',
  'monthly stats for weight should use Things to Track weight color'
);
assert.strictEqual(
  calendarColors.combinedLogs.find((item) => item.type === 'deworming').iconColor,
  '#93C653',
  'daily records for built-in events should use Things to Track icon color'
);
assert.strictEqual(
  calendarColors.combinedLogs.find((item) => item.type === 'custom_custom-1').iconColor,
  '#5DADE2',
  'daily records for custom events should use Things to Track icon color'
);
assert.strictEqual(
  calendarColors.combinedLogs.find((item) => item.typeGroup === 'weight').iconColor,
  '#6C8EBF',
  'daily weight records should use Things to Track weight color'
);

state = createState();
const pageWithFeedbackColor = createPage();
pageWithFeedbackColor.setData({ selectedDate: sameMonthDate().toISOString() });
pageWithFeedbackColor.handleAction(actionEvent({
  type: 'deworming',
  label: 'Deworming',
  color: '#93C653'
}));
assert.strictEqual(
  pageWithFeedbackColor.data.feedbackColor,
  '#93C653',
  'recorded built-in action feedback should use Things to Track icon color'
);

state = createState();
const pageWithCustomFeedbackColor = createPage();
pageWithCustomFeedbackColor.setData({ selectedDate: sameMonthDate().toISOString() });
pageWithCustomFeedbackColor.handleCustomAction(actionEvent({
  id: 'custom-1',
  label: 'Bath',
  color: '#5DADE2',
  iconidx: 0
}));
assert.strictEqual(
  pageWithCustomFeedbackColor.data.feedbackColor,
  '#5DADE2',
  'recorded custom action feedback should use Things to Track icon color'
);

state = createState();
state.pets[0].species = 'cat';
state.pets[0].hiddenActions = ['scoop_litter'];
state.customActions = [
  { id: 'custom-scoop-zh', petId: 'pet-1', label: '铲屎提醒', color: '#C49A6C', iconIdx: 0 }
];
const pageWithChineseScoopReplacement = createPage();
pageWithChineseScoopReplacement.refreshData();
assert.strictEqual(
  pageWithChineseScoopReplacement.data.showLastAction,
  true,
  'custom actions containing 铲屎 should restore Last Scooped in Stock Alert'
);

state = createState();
state.pets[0].species = 'cat';
state.pets[0].hiddenActions = ['scoop_litter'];
state.customActions = [
  { id: 'custom-scoop-en', petId: 'pet-1', label: 'Evening Scoop', color: '#C49A6C', iconIdx: 0 }
];
const pageWithEnglishScoopReplacement = createPage();
pageWithEnglishScoopReplacement.refreshData();
assert.strictEqual(
  pageWithEnglishScoopReplacement.data.showLastAction,
  true,
  'custom actions containing scoop should restore Last Scooped in Stock Alert'
);

state = createState();
state.pets[0].actionOrder = ['custom:custom-1', 'builtin:deworming'];
const pageWithCustomOrder = createPage();
pageWithCustomOrder.refreshData();
assert.deepStrictEqual(
  pageWithCustomOrder.data.trackActions.slice(0, 2).map((item) => item.actionKey),
  ['custom:custom-1', 'builtin:deworming'],
  'saved Things to Track order should mix built-in and custom actions'
);

state = createState();
const pageInEditMode = createPage();
pageInEditMode.setData({
  isEditingActions: true,
  selectedDate: '2026-04-26T00:00:00.000Z'
});

pageInEditMode.handleAction(actionEvent({ type: 'deworming', label: 'Deworming' }));
pageInEditMode.handleCustomAction(actionEvent({
  id: 'custom-1',
  label: 'Bath',
  color: '#5DADE2',
  iconidx: 0
}));
pageInEditMode.openCustomModal();

assert.strictEqual(
  state.logs.length,
  0,
  'editing Things to Track should not log built-in or custom actions'
);
assert.strictEqual(
  pageInEditMode.data.showCustomModal,
  false,
  'editing Things to Track should not open the custom action modal'
);

state = createState();
const pageWithDrag = createPage();
pageWithDrag.refreshData();
pageWithDrag.setData({ isEditingActions: true });
pageWithDrag.onTrackActionTouchStart({
  currentTarget: { dataset: { actionKey: 'builtin:deworming', index: 0 } },
  touches: [{ clientX: 0 }]
});
pageWithDrag.onTrackActionTouchMove({
  currentTarget: { dataset: { actionKey: 'builtin:deworming', index: 0 } },
  touches: [{ clientX: 80 }]
});
pageWithDrag.onTrackActionTouchEnd();

assert.deepStrictEqual(
  state.pets[0].actionOrder.slice(0, 2),
  ['builtin:brush_teeth', 'builtin:deworming'],
  'dragging a track action should persist the reordered action keys'
);
assert.deepStrictEqual(
  pageWithDrag.data.stockActionItems.slice(0, 2).map((item) => item.actionKey),
  ['builtin:brush_teeth', 'builtin:deworming'],
  'Stock Alert event order should follow dragged Things to Track order'
);

console.log('dashboard action tests passed');
