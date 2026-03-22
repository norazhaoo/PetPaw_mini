// components/custom-tab-bar/custom-tab-bar.js
const { t } = require('../../utils/i18n');

Component({
  data: {
    active: 0,
    list: [
      { pagePath: '/pages/pawfile/pawfile', icon: 'PawPrint', label: 'Pawfile' },
      { pagePath: '/pages/dashboard/dashboard', icon: 'CalendarHeart', label: 'Diary' },
      { pagePath: '/pages/stock/stock', icon: 'Package', label: 'Stock' },
      { pagePath: '/pages/medical/medical', icon: 'Stethoscope', label: 'Medical' },
      { pagePath: '/pages/settings/settings', icon: 'Settings', label: 'Settings' }
    ]
  },

  lifetimes: {
    attached() {
      this.updateLabels();
    }
  },

  pageLifetimes: {
    show() {
      this.updateLabels();
      // 动态检测当前页面
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const url = '/' + pages[pages.length - 1].route;
        const idx = this.data.list.findIndex(item => item.pagePath === url);
        if (idx >= 0) {
          this.setData({ active: idx });
        }
      }
    }
  },

  methods: {
    updateLabels() {
      const list = this.data.list.map((item, i) => {
        const keys = ['pawfile', 'diary', 'stock', 'medical_log', 'settings'];
        return { ...item, label: t(keys[i]) };
      });
      this.setData({ list });
    },

    switchTab(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      const item = this.data.list[idx];
      if (this.data.active === idx) return;
      wx.switchTab({ url: item.pagePath });
    }
  }
});
