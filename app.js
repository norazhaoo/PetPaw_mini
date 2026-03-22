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
    // 通知所有已挂载的页面刷新数据
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page && typeof page.refreshData === 'function') {
        page.refreshData();
      }
    });
  }
});
