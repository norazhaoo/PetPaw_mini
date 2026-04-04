Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/pawfile/pawfile",
        iconPath: "/static/icons/tab-pawfile.png",
        selectedIconPath: "/static/icons/tab-pawfile-active.png",
        textKey: "pawfile"
      },
      {
        pagePath: "/pages/dashboard/dashboard",
        iconPath: "/static/icons/tab-diary.png",
        selectedIconPath: "/static/icons/tab-diary-active.png",
        textKey: "diary"
      },
      {
        pagePath: "/pages/stock/stock",
        iconPath: "/static/icons/tab-stock.png",
        selectedIconPath: "/static/icons/tab-stock-active.png",
        textKey: "stock"
      },
      {
        pagePath: "/pages/medical/medical",
        iconPath: "/static/icons/tab-medical.png",
        selectedIconPath: "/static/icons/tab-medical-active.png",
        textKey: "medical_log"
      },
      {
        pagePath: "/pages/settings/settings",
        iconPath: "/static/icons/tab-settings.png",
        selectedIconPath: "/static/icons/tab-settings-active.png",
        textKey: "settings"
      }
    ],
    texts: []
  },

  lifetimes: {
    attached() {
      this.updateLang();
    }
  },

  methods: {
    updateLang() {
      // Need dynamic import or direct access because app may have changed it.
      const app = getApp();
      // Using app method or directly requiring i18n
      const i18n = require('../utils/i18n.js');
      const texts = this.data.list.map(item => i18n.t(item.textKey));
      this.setData({ texts });
    },
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    }
  }
})
