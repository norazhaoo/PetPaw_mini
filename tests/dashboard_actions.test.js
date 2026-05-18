const assert = require('assert');
const fs = require('fs');
const path = require('path');

let state;
let capturedPage;
let showModalCalls = [];
let nextModalConfirm = true;
let exportCalled = false;
let storageData = null;

global.wx = {
  getStorageSync(key) {
    if (key === 'petpaw_data') return storageData;
    return null;
  },
  setStorage() {},
  removeStorageSync() {},
  showActionSheet(options) {
    if (options && typeof options.success === 'function') {
      options.success({ tapIndex: 1 });
    }
  },
  chooseMedia(options) {
    if (options && typeof options.success === 'function') {
      options.success({ tempFiles: [{ tempFilePath: '/tmp/journal-photo.jpg' }] });
    }
  },
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
const storage = require('../utils/storage');

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
    customActions: [{ id: 'custom-1', petId: 'pet-1', label: 'Bath', color: '#5DADE2', iconIdx: 6 }],
    journalEntries: []
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

function expectContainsTokens(source, tokens, message) {
  assert(tokens.every(token => source.includes(token)), message);
}

function readDashboardJs() {
  return fs.readFileSync(path.join(__dirname, '..', 'pages/dashboard/dashboard.js'), 'utf8');
}

function readAppWxss() {
  return fs.readFileSync(path.join(__dirname, '..', 'app.wxss'), 'utf8');
}

function readTabBarWxss() {
  return fs.readFileSync(path.join(__dirname, '..', 'custom-tab-bar/index.wxss'), 'utf8');
}

function readZIndex(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)`));
  return match ? Number(match[1]) : NaN;
}

storageData = null;
assert.deepStrictEqual(
  storage.loadState().journalEntries,
  [],
  'default state should include an empty journalEntries collection'
);
storageData = {
  activePetId: 'pet-1',
  pets: [],
  inventoryItems: [],
  logs: [],
  reminders: [],
  weightHistory: [],
  medicalRecords: [],
  customActions: []
};
assert.deepStrictEqual(
  storage.loadState().journalEntries,
  [],
  'loadState should migrate older saves with an empty journalEntries collection'
);
storageData = null;

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
  pageWithI18n.data.i18n.export_drawing_hint,
  '正在绘制您的专属报告',
  'dashboard should load export loading copy from i18n'
);
assert.strictEqual(
  pageWithI18n.data.i18n.save_to_album,
  '保存到相册',
  'dashboard should load export action copy from i18n'
);
assert.strictEqual(
  pageWithI18n.data.i18n.journal_title,
  '小猫日记',
  'dashboard should load the Chinese Pet Journal title'
);
assert.strictEqual(
  pageWithI18n.data.i18n.journal_mood_good_appetite,
  '胃口好',
  'dashboard should load journal mood copy from i18n'
);
assert.strictEqual(
  pageWithI18n.data.exportCanvasVisible,
  false,
  'export canvas should not be mounted before poster generation starts'
);

const dashboardWxml = readDashboardWxml();
const dashboardJs = readDashboardJs();
const dashboardWxss = readDashboardWxss();
const appWxss = readAppWxss();
const tabBarWxss = readTabBarWxss();
const heroOverviewCardY = Number((dashboardJs.match(/async _drawPosterHeroSection[\s\S]*?const cardY = (\d+);/) || [])[1]);
expectContainsTokens(
  dashboardWxml,
  ['i18n.stock_alert', 'inventoryItems', 'stockActionItems'],
  'dashboard should render Stock Alert above the daily record area'
);
expectContainsTokens(
  dashboardWxml,
  ['cal-grid', 'prevMonth', 'nextMonth', 'selectDate', 'goToday'],
  'dashboard should restore the calendar controls for backdated records'
);
assert(
  !dashboardWxml.includes('weightCanvas') && !dashboardWxml.includes('monthlyStats'),
  'dashboard should not render the old weight chart or monthly stats cards'
);
expectContainsTokens(
  dashboardWxml,
  ['monthly-poster-card', 'openStatsRules', 'i18n.export_drawing_hint', 'i18n.export_preview_hint'],
  'dashboard should render poster CTA and preview rule entry point'
);
expectContainsTokens(
  dashboardWxml,
  ['activeDiaryView', 'switchDiaryView', 'openJournalModal', 'showJournalModal', 'journalTimeline', 'journalFilterOptions', 'openJournalDetail'],
  'dashboard should render the journal view switch, entry point, modal, notebook timeline, filters, and detail handler'
);
assert(
  dashboardWxml.indexOf('{{i18n.today_check_in}}') > -1 &&
    dashboardWxml.indexOf('class="diary-view-switch"') > -1 &&
    dashboardWxml.indexOf('{{i18n.today_check_in}}') < dashboardWxml.indexOf('class="diary-view-switch"'),
  'quick-record heading should sit above the diary calendar title switch'
);
assert(
  heroOverviewCardY >= 328,
  'poster overview card should leave clear breathing room below the yellow hero curve'
);
assert(
  appWxss.includes('padding-bottom: calc(260rpx + env(safe-area-inset-bottom));'),
  'tab pages should reserve enough bottom scroll space for the custom tab bar and safe area'
);
assert(
  readZIndex(tabBarWxss, '.tab-bar-container') < readZIndex(appWxss, '.modal-overlay'),
  'custom tab bar should sit below page modals so poster preview is not covered'
);
assert(
  dashboardWxml.includes('export-preview-content') &&
    dashboardWxss.includes('padding: 60rpx 40rpx calc(160rpx + env(safe-area-inset-bottom));'),
  'poster preview should keep scrollable safe-area padding below the exported image'
);
assert(
  dashboardWxml.includes('class="export-preview-actions"') &&
    dashboardWxml.includes('bindtap="saveExportImage"') &&
    dashboardWxml.includes('{{i18n.save_to_album}}') &&
    dashboardWxss.includes('.export-preview-actions') &&
    dashboardWxss.includes('.export-preview-save'),
  'poster preview should keep a visible save-to-album action after the bottom sheet removal'
);
assert(
  dashboardWxml.includes('bindlongpress="saveExportImage"') &&
    !dashboardWxml.includes('catchtap="previewExportImage"'),
  'poster preview image should save directly on long press instead of opening full-screen preview first'
);
assert(
  pageWithI18n.data.i18n.export_preview_hint === '长按图片可直接保存到相册',
  'Chinese poster preview hint should describe direct long-press saving'
);
const enI18n = require('../utils/i18n/en');
assert.strictEqual(
  enI18n.export_preview_hint,
  'Long press the image to save it to Photos',
  'English poster preview hint should describe direct long-press saving'
);
assert(
  !dashboardWxml.includes('export-sheet-heading') &&
    !dashboardWxml.includes('class="safe-bottom"') &&
    !dashboardWxml.includes('<text>{{i18n.monthly_care_poster}}</text>'),
  'poster export preview should not show a blocking bottom sheet with the poster title'
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
  !dashboardJs.includes('const H = 2260'),
  'poster export height should be computed from poster content instead of fixed at 2260'
);
const offscreenExportSource = dashboardJs.slice(
  dashboardJs.indexOf('async _exportReportWithOffscreenCanvas'),
  dashboardJs.indexOf('_saveOffscreenCanvasToTempFile')
);
assert(
  offscreenExportSource.includes('this._getPosterExportContext()') &&
    offscreenExportSource.includes('this._getAppleReportHeight(reportContext.posterStats)') &&
    offscreenExportSource.includes('this._drawAppleReport(canvas, ctx, W, H, reportContext)'),
  'offscreen poster export should compute dynamic height from a shared poster context'
);
const nodeExportSource = dashboardJs.slice(
  dashboardJs.indexOf('_exportReportWithNodeCanvas'),
  dashboardJs.indexOf('closeExportModal()')
);
assert(
  nodeExportSource.includes('this._getPosterExportContext()') &&
    nodeExportSource.includes('this._getAppleReportHeight(reportContext.posterStats)') &&
    nodeExportSource.includes('this._drawAppleReport(canvas, ctx, W, H, reportContext)'),
  'node canvas poster export should compute dynamic height from the same poster context'
);
assert(
  dashboardWxss.includes('flex-wrap: nowrap') && dashboardWxss.includes('margin-left: -6rpx'),
  'calendar record icons should use a compact single-row overlap instead of vertical stacking'
);
expectContainsTokens(
  dashboardWxss,
  ['.diary-view-switch', '.journal-entry-card', '.journal-modal-card', '.journal-timeline-card', '.journal-filter-row', '.journal-detail-card'],
  'dashboard styles should include journal view switch, entry, modal, timeline, filter, and detail styles'
);
assert(
  dashboardWxml.includes('class="cal-icon-dot"'),
  'calendar should render compact icon containers for day records'
);
assert(
  !dashboardJs.includes("cursorY = this._drawPosterHeatmapSection(ctx"),
  'poster should merge check-in distribution into the highlights card instead of drawing a standalone heatmap section'
);
assert(
  dashboardJs.includes('_drawPosterDateStrip') &&
    dashboardJs.includes('this._drawPosterDateStrip(ctx, W, MARGIN, CARD_W, posterStats, cardY + 210)') &&
    dashboardJs.includes('const tickDays = [1, 5, 10, 15, 20, 25, 30]') &&
    dashboardJs.includes("'3+'") &&
    !dashboardJs.includes('this._drawPosterHeatmapGrid(ctx, W, MARGIN, CARD_W, posterStats, cardY + 210)'),
  'poster check-in distribution should draw a readable date strip with key day ticks and a 3+ intensity legend'
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
    icon: 'FoodBowl'
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
  pageWithStockAlert.data.inventoryItems.map(item => item.iconName),
  ['FoodBowl'],
  'stock alert should preserve each inventory item icon for rendering'
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
const pageWithSelectedDayLogs = createPage();
pageWithSelectedDayLogs.onLoad();
const selectedDayLogs = pageWithSelectedDayLogs._buildSelectedDayLogs(
  state.logs.filter(log => log.petId === 'pet-1'),
  state.weightHistory.filter(weight => weight.petId === 'pet-1'),
  state.customActions,
  new Date(2026, 3, 26, 12)
);
assert.deepStrictEqual(
  selectedDayLogs.combinedLogs.map(item => item.id),
  ['today-weight', 'today-log'],
  'selected day logs should include only records from the selected day, newest first'
);
assert.strictEqual(
  selectedDayLogs.listTitle,
  '记录: 4月26日',
  'selected-day logs should use the selected-date title path'
);

state = createState();
state.logs = [{ id: 'today-log', petId: 'pet-1', type: 'deworming', date: at(26, 9) }];
state.weightHistory = [{ id: 'today-weight', petId: 'pet-1', date: at(26, 20), weight: 4.2 }];
state.journalEntries = [
  { id: 'today-journal', petId: 'pet-1', date: at(26, 21), text: 'Sunny nap by the window', moods: ['good', 'sleepy'], image: '/tmp/journal.jpg' }
];
const pageWithJournalDayLogs = createPage();
pageWithJournalDayLogs.onLoad();
const journalDayLogs = pageWithJournalDayLogs._buildSelectedDayLogs(
  state.logs.filter(log => log.petId === 'pet-1'),
  state.weightHistory.filter(weight => weight.petId === 'pet-1'),
  state.customActions,
  new Date(2026, 3, 26, 12),
  state.journalEntries.filter(entry => entry.petId === 'pet-1')
);
assert.deepStrictEqual(
  journalDayLogs.combinedLogs.map(item => [item.id, item.typeGroup]),
  [['today-journal', 'journal'], ['today-weight', 'weight'], ['today-log', 'log']],
  'selected day logs should include journal summaries newest first'
);
assert.strictEqual(
  journalDayLogs.combinedLogs[0].label,
  '小猫日记',
  'selected day journal rows should use the journal title label'
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
const pageWithSavedJournal = createPage();
pageWithSavedJournal.onLoad();
pageWithSavedJournal.setData({
  selectedDate: backfillDate,
  currentMonth: new Date(2026, 3, 1),
  journalText: '  Sunny nap by the window  ',
  selectedJournalMoods: ['good', 'sleepy'],
  journalImage: '/tmp/journal-photo.jpg',
  showJournalModal: true
});
pageWithSavedJournal.saveJournalEntry();
assert.strictEqual(state.journalEntries.length, 1, 'saving a journal should add one entry');
assert.strictEqual(state.journalEntries[0].petId, 'pet-1', 'saved journal should belong to the active pet');
assert.strictEqual(ymd(state.journalEntries[0].date), '2026-04-25', 'saved journal should use the selected calendar date');
assert.strictEqual(state.journalEntries[0].text, 'Sunny nap by the window', 'saved journal should trim text');
assert.deepStrictEqual(state.journalEntries[0].moods, ['good', 'sleepy'], 'saved journal should store mood ids');
assert.strictEqual(state.journalEntries[0].image, '/tmp/journal-photo.jpg', 'saved journal should store the selected image path');
assert.strictEqual(pageWithSavedJournal.data.showJournalModal, false, 'saving a journal should close the modal');
assert(
  pageWithSavedJournal.data.daysInMonth.find(item => item.dateStr === '2026-04-25').icons.some(item => item.name === 'Book'),
  'calendar day should show a Book icon after saving a journal'
);

state = createState();
state.journalEntries = [
  { id: 'older-active', petId: 'pet-1', date: at(24, 12), text: 'Older note', moods: ['clingy'], image: '' },
  { id: 'newer-active', petId: 'pet-1', date: at(26, 12), text: 'Newer note '.repeat(12), moods: ['good_appetite'], image: '/tmp/newer.jpg' },
  { id: 'other-pet', petId: 'pet-2', date: at(27, 12), text: 'Other pet note', moods: ['good'], image: '' }
];
const pageWithNotebook = createPage();
pageWithNotebook.onLoad();
pageWithNotebook.refreshData();
pageWithNotebook.switchDiaryView(actionEvent({ view: 'notebook' }));
assert.strictEqual(pageWithNotebook.data.activeDiaryView, 'notebook', 'switching views should activate the notebook');
assert.deepStrictEqual(
  pageWithNotebook.data.journalTimeline.map(entry => entry.id),
  ['newer-active', 'older-active'],
  'journal notebook should show only active-pet entries newest first'
);
assert.deepStrictEqual(
  pageWithNotebook.data.journalTimeline[0].moodLabels,
  ['胃口好'],
  'journal notebook should render mood labels from ids'
);
assert(
  pageWithNotebook.data.journalTimeline[0].summary.length < pageWithNotebook.data.journalTimeline[0].text.length,
  'journal notebook cards should expose a compact summary instead of the full note'
);
assert.strictEqual(
  pageWithNotebook.data.journalFilterOptions[0].id,
  'all',
  'journal notebook filters should include an all option first'
);
pageWithNotebook.switchJournalFilter(actionEvent({ filter: 'clingy' }));
assert.strictEqual(pageWithNotebook.data.activeJournalFilter, 'clingy', 'journal filter should store the selected category');
assert.deepStrictEqual(
  pageWithNotebook.data.journalTimeline.map(entry => entry.id),
  ['older-active'],
  'journal filter should show only notes with the selected mood category'
);
pageWithNotebook.switchJournalFilter(actionEvent({ filter: 'all' }));
pageWithNotebook.openJournalDetail(actionEvent({ id: 'newer-active' }));
assert.strictEqual(pageWithNotebook.data.showJournalDetailModal, true, 'tapping a journal card should open the detail modal');
assert.strictEqual(
  pageWithNotebook.data.selectedJournalEntry.id,
  'newer-active',
  'journal detail modal should use the tapped entry'
);
assert.strictEqual(
  pageWithNotebook.data.selectedJournalEntry.text,
  state.journalEntries.find(entry => entry.id === 'newer-active').text,
  'journal detail modal should expose the full note text'
);
pageWithNotebook.closeJournalDetail();
assert.strictEqual(pageWithNotebook.data.showJournalDetailModal, false, 'journal detail modal should close');

pageWithNotebook.deleteJournalEntry(actionEvent({ id: 'newer-active' }));
assert.deepStrictEqual(
  state.journalEntries.map(entry => entry.id),
  ['older-active', 'other-pet'],
  'notebook delete should remove the journal entry from state'
);

state = createState();
state.journalEntries = [{ id: 'delete-selected', petId: 'pet-1', date: at(25, 12), text: 'Delete me', moods: [], image: '' }];
const pageWithJournalDeleteFromLogs = createPage();
pageWithJournalDeleteFromLogs.onLoad();
pageWithJournalDeleteFromLogs.deleteLog(actionEvent({ id: 'delete-selected', typegroup: 'journal' }));
assert.deepStrictEqual(
  state.journalEntries,
  [],
  'selected-day log delete should remove journal entries through the journal delete path'
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
assert.match(
  posterStats.highlights.regularDay.label,
  /^周[日一二三四五六]$/,
  'poster regular day should show a complete Chinese weekday label'
);
assert.deepStrictEqual(
  posterStats.careChanges.map(item => item.type),
  ['walk_dog', 'brush_teeth', 'medical', 'custom_custom-1'],
  'care changes should use dynamic top non-weight visible items only'
);
state.journalEntries = [
  { id: 'journal-only-day', petId: 'pet-1', date: at(10, 14), text: 'Journal-only active day', moods: ['good'], image: '' }
];
const journalPosterStats = pageWithPosterStats._buildPosterStats(state, state.pets[0], posterDate);
assert.strictEqual(
  journalPosterStats.overview.find(item => item.key === 'monthly_records').value,
  10,
  'poster monthly records should not count journal entries in v1'
);
assert.strictEqual(
  journalPosterStats.overview.find(item => item.key === 'active_days').value,
  10,
  'poster active days should include days that only have journal entries'
);
assert.deepStrictEqual(
  journalPosterStats.careChanges.map(item => item.type),
  ['walk_dog', 'brush_teeth', 'medical', 'custom_custom-1'],
  'poster care changes should not include journal entries'
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
assert.strictEqual(
  typeof pageWithPosterStats._getAppleReportHeight,
  'function',
  'poster should expose a dynamic height calculator for export sizing'
);
assert.strictEqual(
  typeof pageWithPosterStats._getPosterCareChangesCardHeight,
  'function',
  'poster should expose the care-changes height helper used by dynamic sizing'
);
assert.strictEqual(
  typeof pageWithPosterStats._getPosterWeightTrendSectionHeight,
  'function',
  'poster should expose the weight-trend height helper used by dynamic sizing'
);
const fullPosterHeight = pageWithPosterStats._getAppleReportHeight(posterStats);
assert(
  fullPosterHeight >= 2100 && fullPosterHeight <= 2160,
  'full-content poster height should keep bottom whitespace visually symmetric with the top'
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
  new Set(allBadgeMedals.map(config => config.medalShape)).size,
  1,
  'poster badges should use one clean round gold medal silhouette'
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
    config.medalShape === 'round-gold' &&
    config.coinFill &&
    config.ringFill &&
    config.innerFill &&
    config.labelFill &&
    Array.isArray(config.ribbonColors) &&
    config.ribbonColors.length === 2 &&
    config.mark
  ),
  'poster badge medals should define finished coin, ribbon, inner plate, ring, label, and center mark layers'
);
const medalDrawingSource = dashboardJs.slice(
  dashboardJs.indexOf('_drawPosterMedalBadge'),
  dashboardJs.indexOf('// ─── Section 4: Supply Snapshot')
);
assert(
  !/shadowColor|shadowBlur|shadowOffsetY|globalAlpha|bezierCurveTo/.test(medalDrawingSource),
  'poster badge medal drawing should avoid Mini Program canvas APIs that can fail in the rendering layer'
);
const footerDrawingSource = dashboardJs.slice(
  dashboardJs.indexOf('_drawPosterFooterSection'),
  dashboardJs.indexOf('// ─── Section 1: Profile')
);
assert(
  !footerDrawingSource.includes('if (startY + cardH < H - 150)') &&
    !footerDrawingSource.includes('H - 86') &&
    footerDrawingSource.includes('const footerBottomMargin = 24') &&
    footerDrawingSource.includes('this.drawCardSection(ctx, MARGIN, startY, CARD_W, cardH, 32'),
  'poster footer should always draw after content instead of skipping the quote card based on fixed canvas height'
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
assert(
  createPage()._getAppleReportHeight(emptyCareStats) < fullPosterHeight,
  'poster with empty care changes and no weight trend should export shorter than a full-content poster'
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
