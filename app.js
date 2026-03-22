const storage = require('./utils/storage');

App({
  globalData: {
    state: null
  },

  onLaunch() {
    // 加载数据并执行库存自动扣减
    let state = storage.loadState();
    state = storage.performDailyDeduction(state);
    this.globalData.state = state;
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
