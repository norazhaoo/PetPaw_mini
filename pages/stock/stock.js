// pages/stock/stock.js
const app = getApp();
const storage = require('../../utils/storage');
const { t } = require('../../utils/i18n');

const ICONS = ['Package', 'Archive', 'walk_dog', 'Fish', 'Cylinder', 'Star', 'Heart', 'Pill'];
const COLORS = ['#F5B041', '#AAB7B8', '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F1948A', '#5DADE2', '#48C9B0', '#F4D03F'];
const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'bag', 'box', 'can'];
const TIME_UNITS = ['day', 'week', 'month', 'quarter', 'year'];
const INTERVALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

Page({
  data: {
    inventoryItems: [],
    isAdding: false,
    newLabel: '',
    newIcon: 'Star',
    newColor: COLORS[0],
    iconOptions: ICONS,
    colorOptions: COLORS,
    unitOptions: UNITS,
    unitOptionsList: [],
    showUnitModal: false,
    editingUnitItemId: null,
    editingUnit: '',
    i18n: {}
  },
  onLoad() {
    this.setData({
      i18n: {
        daily_consumption: t('daily_consumption'), custom: t('custom'),
        add_custom_stock: t('add_custom_stock'), new_stock_item: t('new_stock_item'),
        name: t('name'), select_icon: t('select_icon'), cancel: t('cancel'), create: t('create'),
        delete_confirm: t('delete_confirm'), d: t('d'),
        unit_g: t('unit_g'), unit_kg: t('unit_kg'), unit_ml: t('unit_ml'), unit_L: t('unit_L'),
        unit_cup: t('unit_cup'), unit_bag: t('unit_bag'), unit_box: t('unit_box'), unit_can: t('unit_can'),
        select_unit: t('unit_g') ? t('select_unit') : 'Select Unit',
        every: t('every') || 'Every', consume: t('consume') || 'Consume',
        day: t('day') || 'Day', week: t('week') || 'Week', month: t('month') || 'Month',
        quarter: t('quarter') || 'Quarter', year: t('year') || 'Year'
      },
      unitOptionsList: UNITS.map(u => ({ value: u, label: t('unit_' + u) || u })),
      intervalOptionsList: INTERVALS.map(v => ({ value: v, label: String(v) })),
      timeUnitOptionsList: TIME_UNITS.map(u => ({ value: u, label: t(u) || u }))
    });
  },

  onShow() {
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const state = app.getState();
    const items = (state.inventoryItems || [])
      .filter(item => item.petId === state.activePetId)
      .map(item => {
      const unit = item.unit || 'g';
      const isLargeVolume = unit === 'g' || unit === 'ml';
      // Step amount for button clicks
      const stepAmount = isLargeVolume ? 100 : 1;
      
      // Allow empty values during editing
      const consumptionAmount = item.consumptionAmount === undefined ? (item.dailyConsumption || 0) : item.consumptionAmount;
      const consumptionInterval = item.consumptionInterval === undefined ? 1 : item.consumptionInterval;
      const current = item.current === undefined ? 0 : item.current;
      const consumptionTimeUnit = item.consumptionTimeUnit || 'day';
      const consumptionUnit = item.consumptionUnit || unit;
 
       return {
         ...item,
         unit,
         stepAmount,
         current,
         consumptionAmount,
         consumptionInterval,
         consumptionTimeUnit,
         consumptionUnit,
         unitLabel: t('unit_' + unit) || unit,
         consumptionUnitLabel: t('unit_' + consumptionUnit) || consumptionUnit,
         consumptionTimeUnitLabel: t(consumptionTimeUnit) || consumptionTimeUnit,
         label: item.typeId ? (t('stock_' + item.typeId) || item.label) : item.label,
         isDefault: item.typeId === 'food' || item.typeId === 'litter'
       };
    });

    this.setData({ inventoryItems: items });
  },

  adjustInventory(e) {
    const { id, amount } = e.currentTarget.dataset;
    let state = app.getState();
    state = storage.adjustInventory(state, id, parseFloat(amount));
    app.setState(state);
    this.refreshData();
  },

  onCurrentInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    let state = app.getState();
    state = storage.updateInventory(state, id, { current: value === '' ? '' : (parseFloat(value) || 0) });
    app.setState(state);
  },

  openUnitModal(e) {
    const { id, unit, type } = e.currentTarget.dataset;
    let list = this.data.unitOptionsList;
    if (type === 'interval') list = this.data.intervalOptionsList;
    if (type === 'timeUnit') list = this.data.timeUnitOptionsList;

    this.setData({
      showUnitModal: true,
      editingUnitItemId: id,
      editingUnit: unit,
      editingUnitType: type || 'main',
      currentUnitOptions: list
    });
  },

  closeUnitModal() {
    this.setData({ showUnitModal: false, editingUnitItemId: null });
  },

  onCustomUnitChange(e) {
    const unit = e.currentTarget.dataset.unit;
    const id = this.data.editingUnitItemId;
    const type = this.data.editingUnitType;
    if (!id) return;

    let state = app.getState();
    let update = {};
    if (type === 'consumption') update = { consumptionUnit: unit };
    else if (type === 'interval') update = { consumptionInterval: parseInt(unit) };
    else if (type === 'timeUnit') update = { consumptionTimeUnit: unit };
    else update = { unit };

    state = storage.updateInventory(state, id, update);
    app.setState(state);
    
    this.setData({ showUnitModal: false, editingUnitItemId: null });
    this.refreshData();
  },

  onConsumptionAmountInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    let state = app.getState();
    state = storage.updateInventory(state, id, { consumptionAmount: value === '' ? '' : (parseFloat(value) || 0) });
    app.setState(state);
  },

  onConsumptionIntervalInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    let state = app.getState();
    state = storage.updateInventory(state, id, { consumptionInterval: value === '' ? '' : (parseInt(value) || 1) });
    app.setState(state);
  },

  deleteItem(e) {
    const { id, label } = e.currentTarget.dataset;
    wx.showModal({
      content: `${t('delete_confirm')} ${label}?`,
      success: (res) => {
        if (res.confirm) {
          let state = app.getState();
          state = storage.deleteInventoryItem(state, id);
          app.setState(state);
          this.refreshData();
        }
      }
    });
  },

  noop() {},
  openAddModal() { this.setData({ isAdding: true, newLabel: '', newIcon: 'Star', newColor: COLORS[0] }); },
  closeAddModal() { this.setData({ isAdding: false }); },
  onNewLabelInput(e) { this.setData({ newLabel: e.detail.value }); },
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    const idx = ICONS.indexOf(icon);
    this.setData({ newIcon: icon, newColor: COLORS[idx % COLORS.length] });
  },
  handleAddSubmit() {
    if (!this.data.newLabel.trim()) return;
    let state = app.getState();
    if (!state.activePetId) {
      wx.showToast({ title: '请先选择宠物', icon: 'none' });
      return;
    }
    state = storage.addInventoryItem(state, this.data.newLabel.trim(), this.data.newIcon, this.data.newColor, 10);
    app.setState(state);
    this.setData({ isAdding: false, newLabel: '' });
    this.refreshData();
  }
});
