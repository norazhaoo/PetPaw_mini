// custom-tab-bar/index.js
const { t } = require('../utils/i18n');

// 图标名称列表，对应 /static/icons/ 下的 PNG 文件
const ICON_NAMES = ['tab-pawfile', 'tab-diary', 'tab-stock', 'tab-medical', 'tab-settings'];
const LABEL_KEYS = ['pawfile', 'diary', 'stock', 'medical_log', 'settings'];
const PATHS = [
  '/pages/pawfile/pawfile',
  '/pages/dashboard/dashboard',
  '/pages/stock/stock',
  '/pages/medical/medical',
  '/pages/settings/settings'
];

function buildList(activeIdx) {
  return PATHS.map((pagePath, i) => ({
    pagePath,
    label: t(LABEL_KEYS[i]),
    iconSrc: i === activeIdx
      ? '/static/icons/' + ICON_NAMES[i] + '-active.png'
      : '/static/icons/' + ICON_NAMES[i] + '.png',
    isActive: i === activeIdx
  }));
}

Component({
  data: {
    active: 0,
    list: []
  },

  lifetimes: {
    attached() {
      this.setData({ list: buildList(this.data.active) });
    }
  },

  methods: {
    updateActive(idx) {
      if (idx >= 0 && idx < PATHS.length) {
        this.setData({ active: idx, list: buildList(idx) });
      }
    },

    switchTab(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      if (this.data.active === idx) return;
      wx.switchTab({ url: this.data.list[idx].pagePath });
    }
  }
});
