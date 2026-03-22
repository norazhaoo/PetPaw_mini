// custom-tab-bar/index.js
const { t } = require('../utils/i18n');

// 预定义所有图标 SVG（灰色 inactive 和 黄色 active 两版）
const INACTIVE = '%238F8377';
const ACTIVE = '%23FCDC2A';

function svgPawPrint(c) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'/%3E%3C/svg%3E";
}

function svgCalendar(c) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6'/%3E%3Cpath d='m16 2 0 4'/%3E%3Cpath d='m8 2 0 4'/%3E%3Cpath d='M3 10h18'/%3E%3Cpath d='M21.29 14.7a2.43 2.43 0 0 0-2.65-.52c-.3.12-.57.3-.8.53l-.34.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L17.5 22l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z'/%3E%3C/svg%3E";
}

function svgPackage(c) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3Cpath d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'/%3E%3Cpath d='m3.3 7 8.7 5 8.7-5'/%3E%3Cpath d='M12 22V12'/%3E%3C/svg%3E";
}

function svgStethoscope(c) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3'/%3E%3Cpath d='M8 15v1a6 6 0 0 0 6 6h.87a2 2 0 0 0 1.42-.59l.35-.34'/%3E%3Ccircle cx='20' cy='18' r='2'/%3E%3C/svg%3E";
}

function svgSettings(c) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E";
}

const svgFns = [svgPawPrint, svgCalendar, svgPackage, svgStethoscope, svgSettings];
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
    iconSrc: svgFns[i](i === activeIdx ? ACTIVE : INACTIVE),
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

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const url = '/' + pages[pages.length - 1].route;
        const idx = PATHS.indexOf(url);
        if (idx >= 0 && idx !== this.data.active) {
          this.setData({ active: idx, list: buildList(idx) });
        } else {
          // 刷新标签文字（语言切换后）
          this.setData({ list: buildList(this.data.active) });
        }
      }
    }
  },

  methods: {
    switchTab(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      if (this.data.active === idx) return;
      const item = this.data.list[idx];
      this.setData({ active: idx, list: buildList(idx) });
      wx.switchTab({ url: item.pagePath });
    }
  }
});
