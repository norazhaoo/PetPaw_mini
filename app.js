const storage = require('./utils/storage');

App({
  globalData: {
    state: null
  },

  onLaunch() {
    // 同步加载数据（冷启动必须）
    const state = storage.loadState();
    this.globalData.state = state;

    // 库存自动扣减延迟到下一个时间片，不阻塞首屏渲染
    setTimeout(() => {
      this.globalData.state = storage.performDailyDeduction(this.globalData.state);
    }, 0);
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
