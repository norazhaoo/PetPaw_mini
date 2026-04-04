// pages/splash/splash.js
const app = getApp();

Page({
  onReady() {
    // 等待 app.onLaunch 完成数据初始化后跳转
    // 最少显示 600ms 避免闪屏感
    const minDelay = 600;
    const start = Date.now();

    const doNavigate = () => {
      const state = app.getState();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDelay - elapsed);

      setTimeout(() => {
        // 根据是否有宠物决定跳转目标
        if (state && state.pets && state.pets.length > 0) {
          wx.switchTab({ url: '/pages/dashboard/dashboard' });
        } else {
          wx.switchTab({ url: '/pages/pawfile/pawfile' });
        }
      }, remaining);
    };

    // 检查 state 是否已经加载完毕
    if (app.getState()) {
      doNavigate();
    } else {
      // 极少数情况下 state 还没准备好，轮询等待
      const timer = setInterval(() => {
        if (app.getState()) {
          clearInterval(timer);
          doNavigate();
        }
      }, 50);
    }
  }
});
