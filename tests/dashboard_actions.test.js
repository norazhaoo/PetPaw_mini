const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const icons = require('../utils/icons.wxs');

let state;
let capturedPage;
let showModalCalls = [];
let nextModalConfirm = true;

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
    customActions: [{ id: 'custom-1', petId: 'pet-1', label: 'Bath', color: '#5DADE2', iconIdx: 6 }]
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

function resetModal(confirm = true) {
  showModalCalls = [];
  nextModalConfirm = confirm;
}

function dominantOpaqueRgb(relativePath) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', relativePath)));
  const counts = {};
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] !== 255) continue;
    const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

state = createState();
const pageWithCustomPlaceholder = createPage();
pageWithCustomPlaceholder.onLoad();
assert.strictEqual(
  pageWithCustomPlaceholder.data.i18n.custom_event_placeholder,
  '例如：洗澡时间',
  'custom event placeholder should be loaded from i18n'
);
assert.deepStrictEqual(
  pageWithCustomPlaceholder.data.customIconNames.slice(0, 6),
  ['vaccine', 'deworming', 'brush_teeth', 'log_weight', 'walk_dog', 'scoop_litter'],
  'custom icon picker should put built-in Things to Track icons first'
);
assert.deepStrictEqual(
  pageWithCustomPlaceholder.data.customIconNames.slice(6),
  ['Star', 'Heart', 'Droplet', 'Sun', 'Zap', 'Smile', 'Music', 'Coffee', 'CameraCustom', 'Gift', 'Umbrella', 'Book', 'Feather', 'Flame', 'Moon', 'Cloud'],
  'custom icon picker should use the monochrome custom camera icon with other custom icons'
);
assert.strictEqual(
  icons.src('CameraCustom'),
  '/static/icons/icon-camera.png',
  'custom camera icon should use the monochrome custom icon asset'
);
assert.strictEqual(
  icons.src('Camera'),
  '/static/icons/camera.png',
  'regular camera icon should keep the original colored photo asset'
);
assert.strictEqual(
  dominantOpaqueRgb('static/icons/icon-camera.png'),
  dominantOpaqueRgb('static/icons/icon-star.png'),
  'custom camera icon should share the same monochrome color as other custom icons'
);
assert.notStrictEqual(
  dominantOpaqueRgb('static/icons/icon-camera.png'),
  dominantOpaqueRgb('static/icons/camera.png'),
  'custom camera icon should not keep the original colored camera color'
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
const pageWithStockAlertTap = createPage();
pageWithStockAlertTap.setData({ selectedDate: sameMonthDate().toISOString() });
pageWithStockAlertTap.handleTrackAction(actionEvent({
  kind: 'builtin',
  type: 'deworming',
  label: 'Deworming',
  color: '#93C653'
}));
pageWithStockAlertTap.handleTrackAction(actionEvent({
  kind: 'custom',
  id: 'custom-1',
  label: 'Bath',
  color: '#5DADE2',
  iconidx: 0
}));
assert.strictEqual(
  state.logs.length,
  0,
  'tapping Stock Alert events should not create daily records'
);

state = createState();
const pageWithTrackTap = createPage();
pageWithTrackTap.setData({ selectedDate: sameMonthDate().toISOString() });
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
  state.logs.map((log) => log.type).sort(),
  ['custom_custom-1', 'deworming'],
  'tapping Things to Track events should still create daily records'
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
const customDeleteDate = sameMonthDate();
state.logs = [
  { id: 'custom-delete-log', petId: 'pet-1', type: 'custom_custom-1', date: customDeleteDate.toISOString(), color: '#5DADE2', iconIdx: 0 },
  { id: 'custom-delete-built-in-log', petId: 'pet-1', type: 'deworming', date: customDeleteDate.toISOString() }
];
const pageWithCanceledCustomDelete = createPage();
pageWithCanceledCustomDelete.setData({
  i18n: { months: [] },
  currentMonth: new Date(customDeleteDate.getFullYear(), customDeleteDate.getMonth(), 1),
  selectedDate: customDeleteDate
});
const customDeleteMonth = new Date(customDeleteDate.getFullYear(), customDeleteDate.getMonth(), 1);
const customCalendarBeforeDelete = pageWithCanceledCustomDelete._buildCalendar(state, customDeleteMonth, customDeleteDate, true);
assert(
  customCalendarBeforeDelete.monthlyStats.some((item) => item.type === 'custom_custom-1'),
  'custom item should appear in monthly stats before deletion'
);
assert(
  customCalendarBeforeDelete.combinedLogs.some((item) => item.type === 'custom_custom-1'),
  'custom item should appear in selected-day records before deletion'
);
resetModal(false);
pageWithCanceledCustomDelete.deleteCustomAction(actionEvent({ id: 'custom-1', label: 'Bath' }));
assert.strictEqual(
  showModalCalls.length,
  1,
  'deleting a custom Things to Track item should ask for confirmation'
);
assert(
  showModalCalls[0].content.includes('历史记录'),
  'custom delete confirmation should warn that historical records will be deleted'
);
assert.strictEqual(
  state.customActions.length,
  1,
  'canceling custom Things to Track deletion should keep the item'
);
assert.strictEqual(
  state.logs.length,
  2,
  'canceling custom Things to Track deletion should keep historical logs'
);

resetModal(true);
pageWithCanceledCustomDelete.deleteCustomAction(actionEvent({ id: 'custom-1', label: 'Bath' }));
assert(
  !state.customActions.some((action) => action.id === 'custom-1'),
  'confirming custom Things to Track deletion should remove the item'
);
assert(
  !state.logs.some((log) => log.type === 'custom_custom-1'),
  'confirming custom Things to Track deletion should remove all matching custom log history'
);
assert(
  state.logs.some((log) => log.type === 'deworming'),
  'confirming custom Things to Track deletion should keep unrelated logs'
);
const customCalendarAfterDelete = pageWithCanceledCustomDelete._buildCalendar(state, customDeleteMonth, customDeleteDate, true);
assert(
  !customCalendarAfterDelete.monthlyStats.some((item) => item.type === 'custom_custom-1'),
  'custom Things to Track deletion should remove the item from monthly stats'
);
assert(
  !customCalendarAfterDelete.combinedLogs.some((item) => item.type === 'custom_custom-1'),
  'custom Things to Track deletion should remove the item from selected-day records'
);

state = createState();
const builtinDeleteDate = sameMonthDate();
state.logs = [
  { id: 'builtin-delete-log', petId: 'pet-1', type: 'deworming', date: builtinDeleteDate.toISOString() },
  { id: 'builtin-delete-custom-log', petId: 'pet-1', type: 'custom_custom-1', date: builtinDeleteDate.toISOString(), color: '#5DADE2', iconIdx: 0 }
];
const pageWithBuiltinDelete = createPage();
pageWithBuiltinDelete.setData({
  i18n: { months: [] },
  currentMonth: new Date(builtinDeleteDate.getFullYear(), builtinDeleteDate.getMonth(), 1),
  selectedDate: builtinDeleteDate
});
const builtinDeleteMonth = new Date(builtinDeleteDate.getFullYear(), builtinDeleteDate.getMonth(), 1);
const builtinCalendarBeforeDelete = pageWithBuiltinDelete._buildCalendar(state, builtinDeleteMonth, builtinDeleteDate, true);
assert(
  builtinCalendarBeforeDelete.monthlyStats.some((item) => item.type === 'deworming'),
  'built-in item should appear in monthly stats before deletion'
);
assert(
  builtinCalendarBeforeDelete.combinedLogs.some((item) => item.type === 'deworming'),
  'built-in item should appear in selected-day records before deletion'
);
resetModal(true);
pageWithBuiltinDelete.hideQuickAction(actionEvent({ type: 'deworming', label: 'Deworming' }));
assert(
  state.pets[0].hiddenActions.includes('deworming'),
  'confirming built-in Things to Track deletion should hide the item'
);
assert(
  !state.logs.some((log) => log.type === 'deworming'),
  'confirming built-in Things to Track deletion should remove all matching log history'
);
assert(
  state.logs.some((log) => log.type === 'custom_custom-1'),
  'confirming built-in Things to Track deletion should keep unrelated custom logs'
);
const builtinCalendarAfterDelete = pageWithBuiltinDelete._buildCalendar(state, builtinDeleteMonth, builtinDeleteDate, true);
assert(
  !builtinCalendarAfterDelete.monthlyStats.some((item) => item.type === 'deworming'),
  'built-in Things to Track deletion should remove the item from monthly stats'
);
assert(
  !builtinCalendarAfterDelete.combinedLogs.some((item) => item.type === 'deworming'),
  'built-in Things to Track deletion should remove the item from selected-day records'
);

state = createState();
const weightDeleteDate = sameMonthDate();
state.weightHistory = [
  { id: 'weight-delete-log', petId: 'pet-1', date: weightDeleteDate.toISOString(), weight: 4.2 }
];
state.logs = [
  { id: 'weight-delete-built-in-log', petId: 'pet-1', type: 'deworming', date: weightDeleteDate.toISOString() }
];
const pageWithWeightDelete = createPage();
pageWithWeightDelete.setData({
  i18n: { months: [] },
  currentMonth: new Date(weightDeleteDate.getFullYear(), weightDeleteDate.getMonth(), 1),
  selectedDate: weightDeleteDate
});
const weightDeleteMonth = new Date(weightDeleteDate.getFullYear(), weightDeleteDate.getMonth(), 1);
const weightCalendarBeforeDelete = pageWithWeightDelete._buildCalendar(state, weightDeleteMonth, weightDeleteDate, true);
assert(
  weightCalendarBeforeDelete.monthlyStats.some((item) => item.type === 'log_weight'),
  'weight item should appear in monthly stats before deletion'
);
assert(
  weightCalendarBeforeDelete.combinedLogs.some((item) => item.typeGroup === 'weight'),
  'weight item should appear in selected-day records before deletion'
);
resetModal(true);
pageWithWeightDelete.hideQuickAction(actionEvent({ type: 'log_weight', label: '记录体重' }));
assert(
  state.pets[0].hiddenActions.includes('log_weight'),
  'confirming weight Things to Track deletion should hide the item'
);
assert.strictEqual(
  state.weightHistory.length,
  0,
  'confirming weight Things to Track deletion should remove all matching weight history'
);
assert(
  state.logs.some((log) => log.type === 'deworming'),
  'confirming weight Things to Track deletion should keep unrelated logs'
);
const weightCalendarAfterDelete = pageWithWeightDelete._buildCalendar(state, weightDeleteMonth, weightDeleteDate, true);
assert(
  !weightCalendarAfterDelete.monthlyStats.some((item) => item.type === 'log_weight'),
  'weight Things to Track deletion should remove the item from monthly stats'
);
assert(
  !weightCalendarAfterDelete.combinedLogs.some((item) => item.typeGroup === 'weight'),
  'weight Things to Track deletion should remove the item from selected-day records'
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
