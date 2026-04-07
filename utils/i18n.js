// utils/i18n.js - 国际化模块（拆分版）
// 微信小程序 require 必须使用静态路径，不支持变量

// 静态加载所有语言文件（每个文件独立便于维护）
const LANG_SETS = {
  en: require('./i18n/en'),
  zh: require('./i18n/zh')
};

// 冷启动时读取一次语言设置
let _cachedLang = '';
try { _cachedLang = wx.getStorageSync('petpaw_language') || 'zh'; } catch(e) { _cachedLang = 'zh'; }
let _cachedSet = LANG_SETS[_cachedLang] || LANG_SETS['zh'];
const _fallbackSet = LANG_SETS['zh'];

/**
 * 获取翻译文本（使用内存缓存，零 I/O）
 */
function t(key) {
  return _cachedSet[key] || _fallbackSet[key] || key;
}

/**
 * 获取当前语言
 */
function getLanguage() {
  return _cachedLang;
}

/**
 * 设置语言（同时更新缓存）
 */
function setLanguage(lang) {
  _cachedLang = lang;
  _cachedSet = LANG_SETS[lang] || _fallbackSet;
  wx.setStorageSync('petpaw_language', lang);
}

module.exports = {
  t,
  getLanguage,
  setLanguage
};
