// pages/stock/stock.js
const app = getApp();
const storage = require('../../utils/storage');
const { t } = require('../../utils/i18n');

const ICONS = ['Package', 'Archive', 'walk_dog', 'Fish', 'Cylinder', 'Star', 'Heart', 'Pill'];
const COLORS = ['#F5B041', '#AAB7B8', '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F1948A', '#5DADE2', '#48C9B0', '#F4D03F'];
const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'bag', 'box', 'can'];

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
        unit_cup: t('unit_cup'), unit_bag: t('unit_bag'), unit_box: t('unit_box'), unit_can: t('unit_can')
      }
    });
  },

  onShow() {
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const state = app.getState();
    const items = (state.inventoryItems || []).map(item => {
      const unit = item.unit || 'g';
      const isLargeVolume = unit === 'g' || unit === 'ml';
      const presets = isLargeVolume ? [50, 100, 150] : [1, 2, 3];
      const stepAmount = isLargeVolume ? 100 : 1;
      const isCustomConsumption = !presets.includes(item.dailyConsumption);
      return {
        ...item,
        unit,
        isLargeVolume,
        presets,
        stepAmount,
        isCustomConsumption,
        unitLabel: t('unit_' + unit) || unit,
        isDefault: item.id === 'food' || item.id === 'litter',
        unitPickerIndex: UNITS.indexOf(unit) >= 0 ? UNITS.indexOf(unit) : 0
      };
    });

    this.setData({ inventoryItems: items });
  },

  adjustInventory(e) {
    const { id, amount } = e.currentTarget.dataset;
    let state = app.getState();
    state = storage.adjustInventory(state, id, parseInt(amount));
    app.setState(state);
    this.refreshData();
  },

  onCurrentInput(e) {
    const id = e.currentTarget.dataset.id;
    const val = parseFloat(e.detail.value) || 0;
    let state = app.getState();
    state = storage.updateInventory(state, id, { current: Math.max(0, val) });
    app.setState(state);
    this.refreshData();
  },

  onUnitChange(e) {
    const id = e.currentTarget.dataset.id;
    const idx = parseInt(e.detail.value);
    const unit = UNITS[idx];
    let state = app.getState();
    state = storage.updateInventory(state, id, { unit });
    app.setState(state);
    this.refreshData();
  },

  selectPreset(e) {
    const { id, val } = e.currentTarget.dataset;
    let state = app.getState();
    state = storage.updateInventory(state, id, { dailyConsumption: parseInt(val) });
    app.setState(state);
    this.refreshData();
  },

  toggleCustomConsumption(e) {
    // Just a UI toggle - the actual value is in the input
    const id = e.currentTarget.dataset.id;
    const items = this.data.inventoryItems.map(item => {
      if (item.id === id) return { ...item, isCustomConsumption: true };
      return item;
    });
    this.setData({ inventoryItems: items });
  },

  onDailyConsumptionInput(e) {
    const id = e.currentTarget.dataset.id;
    const val = parseFloat(e.detail.value) || 0;
    let state = app.getState();
    state = storage.updateInventory(state, id, { dailyConsumption: val });
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
    state = storage.addInventoryItem(state, this.data.newLabel, this.data.newIcon, this.data.newColor, 10);
    app.setState(state);
    this.setData({ isAdding: false, newLabel: '' });
    this.refreshData();
  }
});
