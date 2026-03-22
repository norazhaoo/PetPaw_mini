// pages/settings/settings.js
const app = getApp();
const storage = require('../../utils/storage');
const i18n = require('../../utils/i18n');

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文 (简体)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'th', label: 'ภาษาไทย' }
];

Page({
  data: {
    showLangMenu: false,
    languages: LANGUAGES,
    currentLang: 'en',
    currentLangLabel: 'English',
    i18nData: {}
  },

  onShow() { this.refreshData(); },

  refreshData() {
    const lang = i18n.getLanguage();
    const langObj = LANGUAGES.find(l => l.code === lang);
    this.setData({
      currentLang: lang,
      currentLangLabel: langObj ? langObj.label : 'English',
      i18nData: {
        settings: i18n.t('settings'), language: i18n.t('language'),
        help: i18n.t('help'), about: i18n.t('about'),
        clear_data: i18n.t('clear_data'), clear_confirm: i18n.t('clear_confirm'),
        data_cleared: i18n.t('data_cleared')
      }
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
    i18n.setLanguage(code);
    this.setData({ showLangMenu: false });
    this.refreshData();
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
