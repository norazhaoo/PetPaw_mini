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
  vibrateShort() {}
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

state = createState();
const pageWithHiddenAction = createPage();
pageWithHiddenAction.setData({ isEditingActions: true });
pageWithHiddenAction.refreshData();
assert(
  !pageWithHiddenAction.data.quickActions.some((item) => item.type === 'vaccine'),
  'hidden quick actions should be removed from Things to Track while editing'
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

console.log('dashboard action tests passed');
