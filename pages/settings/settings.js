// pages/settings/settings.js
const app = getApp();
const storage = require('../../utils/storage');
const i18n = require('../../utils/i18n');

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
];

Page({
  data: {
    showLangMenu: false,
    languages: LANGUAGES,
    currentLang: 'en',
    currentLangLabel: 'English',
    i18nData: {}
  },

  onLoad() {
    this.buildI18n();
  },

  buildI18n() {
    this.setData({
      i18nData: {
        settings: i18n.t('settings'), language: i18n.t('language'),
        help: i18n.t('help'), about: i18n.t('about'),
        contact_service: i18n.t('contact_service'),
        clear_data: i18n.t('clear_data'), clear_confirm: i18n.t('clear_confirm'),
        data_cleared: i18n.t('data_cleared')
      }
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
      this.getTabBar().updateLang();
    }
    wx.setNavigationBarTitle({ title: i18n.t('settings') || 'Settings' });
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const lang = i18n.getLanguage();
    const langObj = LANGUAGES.find(l => l.code === lang);
    this.setData({
      currentLang: lang,
      currentLangLabel: langObj ? langObj.label : 'English'
    });

    // 更新 tabBar 文字
    try {
      wx.setTabBarItem({ index: 0, text: i18n.t('pawfile') });
      wx.setTabBarItem({ index: 1, text: i18n.t('diary') });
      wx.setTabBarItem({ index: 2, text: i18n.t('stock') });
      wx.setTabBarItem({ index: 3, text: i18n.t('medical_log') });
      wx.setTabBarItem({ index: 4, text: i18n.t('settings') });
    } catch (e) {}
  },

  toggleLangMenu() {
    this.setData({ showLangMenu: !this.data.showLangMenu });
  },

  selectLanguage(e) {
    const code = e.currentTarget.dataset.code;
    const oldCode = i18n.getLanguage();
    if (code === oldCode) {
      this.setData({ showLangMenu: false });
      return;
    }
    i18n.setLanguage(code);
    this.setData({ showLangMenu: false });
    wx.reLaunch({ url: '/pages/settings/settings' });
  },

  showHelp() {
    wx.showModal({
      title: i18n.t('help'),
      content: 'Please email support@petpaw.com for assistance or join our Discord!',
      showCancel: false
    });
  },

  showAbout() {
    wx.showModal({
      title: i18n.t('about'),
      content: 'PetPaw v2.5\nLocally encrypted, species-adaptive smart tracking.',
      showCancel: false
    });
  },

  handleClearData() {
    wx.showModal({
      content: i18n.t('clear_confirm'),
      success: (res) => {
        if (res.confirm) {
          const newState = storage.clearAllData();
          app.setState(newState);
          wx.showToast({ title: i18n.t('data_cleared'), icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/pawfile/pawfile' });
          }, 1500);
        }
      }
    });
  }
});
