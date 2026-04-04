const storage = require('./utils/storage');
const i18n = require('./utils/i18n');

App({
  globalData: {
    state: null
  },

  onLaunch() {
    // 同步加载数据（冷启动必须）
    const state = storage.loadState();
    this.globalData.state = state;

    // TabBar 国际化（同步执行，避免闪烁）
    this._updateTabBar();

    // 库存自动扣减延迟到下一个时间片，不阻塞首屏渲染
    setTimeout(() => {
      this.globalData.state = storage.performDailyDeduction(this.globalData.state);
    }, 0);
  },

  _updateTabBar() {
    try {
      wx.setTabBarItem({ index: 0, text: i18n.t('pawfile') });
      wx.setTabBarItem({ index: 1, text: i18n.t('diary') });
      wx.setTabBarItem({ index: 2, text: i18n.t('stock') });
      wx.setTabBarItem({ index: 3, text: i18n.t('medical_log') });
      wx.setTabBarItem({ index: 4, text: i18n.t('settings') });
    } catch (e) {}
  },

  onHide() {
    // 应用切后台时强制持久化，确保防抖中的数据写入
    storage.flushState(this.globalData.state);
  },

  /**
   * 获取当前状态
   */
  getState() {
    return this.globalData.state;
  },

  /**
   * 更新状态并通知所有页面刷新
   */
  setState(newState) {
    this.globalData.state = newState;
    // 只刷新栈顶（当前可见）页面，其他页面在 onShow 时会自动刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.refreshData === 'function') {
      currentPage.refreshData();
    }
  }
});
