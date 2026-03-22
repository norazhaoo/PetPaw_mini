// pages/dashboard/dashboard.js
const app = getApp();
const storage = require('../../utils/storage');
const { t } = require('../../utils/i18n');
const dateUtil = require('../../utils/date');

// 自定义图标列表，对应 CUSTOM_ICONS 数组
const CUSTOM_ICON_NAMES = ['Star', 'Heart', 'Droplet', 'Sun', 'Zap', 'Smile', 'Music', 'Coffee', 'Camera', 'Gift', 'Umbrella', 'Book', 'Feather', 'Flame', 'Moon', 'Cloud'];
const LABEL_MAP = {
  vaccine: 'Vaccination', deworming: 'Deworming', brush_teeth: 'Brushed Teeth',
  scoop_litter: 'Scooped Box', walk_dog: 'Walked Dog',
  food_refill: 'Refill Food', litter_refill: 'Refill Litter'
};
const COLOR_MAP = {
  vaccine: '#FF7B54', deworming: '#93C653', brush_teeth: '#5DADE2',
  scoop_litter: '#8F8377', walk_dog: '#8F8377'
};
const COLORS = ['#FF7B54', '#93C653', '#5DADE2', '#FEE140', '#9B59B6', '#E74C3C'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

Page({
  data: {
    activePet: null,
    isDog: false,
    quickActions: [],
    customActions: [],
    inventoryItems: [],
    showWarning: false,
    lastActionText: 'Never',
    // Calendar
    currentMonth: null,
    currentMonthLabel: '',
    selectedDate: null,
    selectedDateStr: '',
    weekdays: WEEKDAYS,
    blanks: [],
    daysInMonth: [],
    // Logs
    listTitle: '',
    combinedLogs: [],
    feedback: '',
    // Stats
    monthlyStats: [],
    // Weight
    chartData: [],
    hasWeightData: false,
    // Modals
    showCustomModal: false,
    customName: '',
    customColor: COLORS[4],
    customIconIdx: 0,
    customIconNames: CUSTOM_ICON_NAMES,
    colorOptions: COLORS,
    showWeightModal: false,
    newWeight: 4.0,
    // i18n
    i18n: {},
    // 分段渲染标志：重模块（日历、图表、日志）等 ready=true 后才渲染
    ready: false
  },

  onLoad() {
    // i18n 只构建一次（语言改变时 settings 页会 reLaunch）
    this.setData({
      i18n: {
        stock_alert: t('stock_alert'), things_to_track: t('things_to_track'),
        monthly_stats: t('monthly_stats'), no_activity: t('no_activity'),
        weight_history: t('weight_history'), no_weight_history: t('no_weight_history'),
        no_records_day: t('no_records_day'), new_custom_event: t('new_custom_event'),
        select_icon: t('select_icon'), select_color: t('select_color'),
        cancel: t('cancel'), save: t('save'), log_weight: t('log_weight'),
        recorded_weight: t('recorded_weight'), last_scooped: t('last_scooped'), last_walked: t('last_walked'),
        today_logs: t('today_logs'), logs_for: t('logs_for')
      }
    });
  },

  onShow() {
    // 延迟数据加载，让页面模板先渲染出来
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const state = app.getState();
    if (!state.activePetId) {
      wx.switchTab({ url: '/pages/pawfile/pawfile' });
      return;
    }

    const activePet = state.pets.find(p => p.id === state.activePetId);
    if (!activePet) {
      wx.switchTab({ url: '/pages/pawfile/pawfile' });
      return;
    }

    const isDog = activePet.species === 'dog';
    const quickActions = isDog
      ? ['vaccine', 'deworming', 'brush_teeth', 'walk_dog']
      : ['vaccine', 'deworming', 'brush_teeth', 'scoop_litter'];

    const customActions = state.customActions.filter(ca => ca.petId === state.activePetId).map(ca => ({
      ...ca, iconName: CUSTOM_ICON_NAMES[ca.iconIdx] || CUSTOM_ICON_NAMES[0]
    }));

    // Stock Alert
    const showWarning = state.inventoryItems?.some(item => Math.floor(item.current / (item.dailyConsumption || 1)) <= 7) || false;

    // Inventory items with computed daysLeft
    const inventoryItems = (state.inventoryItems || []).map(item => {
      const daysLeft = Math.floor((item.current || 0) / (item.dailyConsumption || 1));
      return { ...item, daysLeft, isLow: daysLeft <= 7, shortLabel: (item.label || '').replace(/ .*/, '') };
    });

    // === 第一阶段：先渲染头部、快速操作等轻量数据 ===
    this.setData({
      activePet,
      isDog,
      quickActions: quickActions.map(type => ({ type, color: COLOR_MAP[type] || '#8F8377', iconName: type })),
      customActions,
      inventoryItems,
      showWarning
    });

    // === 第二阶段：异步计算日历、日志、图表等重数据 ===
    setTimeout(() => {
      this._computeHeavyData(state, activePet, isDog);
    }, 50);
  },

  /**
   * 重数据计算（日历 + 图表 + 日志），合并为单次 setData
   */
  _computeHeavyData(state, activePet, isDog) {
    // ----- Last action -----
    const petLogs = state.logs.filter(l => l.petId === state.activePetId);
    const targetLogType = isDog ? 'walk_dog' : 'scoop_litter';
    const actionLogs = petLogs.filter(l => l.type === targetLogType).sort((a, b) => new Date(b.date) - new Date(a.date));
    let lastActionText = t('never');
    if (actionLogs.length > 0) {
      const dist = dateUtil.formatDistanceToNow(dateUtil.parseISO(actionLogs[0].date));
      lastActionText = dist.replace('about ', '').replace('less than a minute', t('just_now'));
      if (lastActionText !== t('just_now')) lastActionText += ' ' + t('ago');
    }

    // ----- Weight chart data -----
    const petWeights = state.weightHistory.filter(w => w.petId === state.activePetId);
    const chartData = petWeights.map(entry => ({
      ...entry,
      displayDate: dateUtil.formatDate(dateUtil.parseISO(entry.date), 'MMM dd')
    }));

    // ----- Calendar -----
    const currentMonth = this.data.currentMonth || dateUtil.startOfMonth(new Date());
    const selectedDate = this.data.selectedDate || dateUtil.startOfDay(new Date());
    const calendarData = this._buildCalendar(state, currentMonth, selectedDate, isDog);

    // === 合并为单次 setData ===
    this.setData(Object.assign({
      ready: true,
      lastActionText: lastActionText.replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd'),
      chartData,
      hasWeightData: chartData.length > 0,
    }, calendarData));

    // Draw weight chart
    if (chartData.length > 0) {
      setTimeout(() => this.drawWeightChart(chartData), 100);
    }
  },

  /**
   * 使用 Map 索引优化的日历构建 — O(n) 而非 O(n²)
   * 返回 setData 所需的数据对象（不直接调用 setData）
   */
  _buildCalendar(state, currentMonth, selectedDate, isDog) {
    const firstDay = dateUtil.startOfMonth(currentMonth);
    const lastDay = dateUtil.endOfMonth(currentMonth);
    const days = dateUtil.eachDayOfInterval(firstDay, lastDay);
    const startDayOfWeek = dateUtil.getDay(firstDay);
    const blanks = Array.from({ length: startDayOfWeek }).map((_, i) => i);

    const petLogs = state.logs.filter(l => l.petId === state.activePetId);
    const petMeds = state.medicalRecords.filter(m => m.petId === state.activePetId);
    const petWeights = state.weightHistory.filter(w => w.petId === state.activePetId);
    const customActions = state.customActions.filter(ca => ca.petId === state.activePetId);

    // ====== 构建日期索引 Map: dateStr → icons[] — O(logs + meds + weights) ======
    const iconMap = {};
    const _key = (dateStr) => dateStr.slice(0, 10); // 'YYYY-MM-DD'

    petLogs.forEach(l => {
      const k = _key(l.date);
      if (!iconMap[k]) iconMap[k] = [];
      if (l.type.startsWith('custom_') && l.color) {
        iconMap[k].push({ name: CUSTOM_ICON_NAMES[l.iconIdx] || 'Star', color: l.color });
      } else {
        iconMap[k].push({ name: l.type, color: COLOR_MAP[l.type] || '#8F8377' });
      }
    });
    petMeds.forEach(m => {
      const k = _key(m.date);
      if (!iconMap[k]) iconMap[k] = [];
      iconMap[k].push({ name: 'medical', color: '#E74C3C' });
    });
    petWeights.forEach(w => {
      const k = _key(w.date);
      if (!iconMap[k]) iconMap[k] = [];
      iconMap[k].push({ name: 'scale', color: '#3498DB' });
    });

    // ====== 构建每天数据 — O(days) ======
    const daysInMonth = days.map(date => {
      const dateStr = dateUtil.formatDate(date, 'YYYY-MM-DD');
      const icons = iconMap[dateStr] || [];
      return {
        date,
        dateStr,
        dayNum: dateUtil.formatDate(date, 'd'),
        isToday: dateUtil.isToday(date),
        isSelected: dateUtil.isSameDay(date, selectedDate),
        icons: icons.slice(0, 4)
      };
    });

    // ====== Monthly stats — 利用已有 petLogs，按类型聚合 ======
    const currentMonthLogs = petLogs.filter(l => dateUtil.isSameMonth(dateUtil.parseISO(l.date), currentMonth));
    const statsMap = {};
    currentMonthLogs.forEach(log => {
      const key = log.type;
      if (!statsMap[key]) {
        let label = LABEL_MAP[key] || '';
        if (key.startsWith('custom_')) {
          const ca = customActions.find(c => c.id === key.split('_')[1]);
          label = ca ? ca.label : 'Custom';
        }
        statsMap[key] = { count: 0, label, color: log.color || COLOR_MAP[key] || '#8F8377', iconIdx: log.iconIdx, type: key };
      }
      statsMap[key].count += 1;
    });
    const monthlyStats = Object.values(statsMap).map(s => ({
      ...s,
      iconName: s.type.startsWith('custom_') ? (CUSTOM_ICON_NAMES[s.iconIdx] || 'Star') : s.type
    }));
    // Add weight stats
    const monthWeights = petWeights.filter(w => dateUtil.isSameMonth(dateUtil.parseISO(w.date), currentMonth));
    if (monthWeights.length > 0) {
      monthlyStats.push({ iconName: 'scale', color: '#3498DB', count: monthWeights.length });
    }

    // ====== Selected day logs ======
    const selectedDayData = this._buildSelectedDayLogs(petLogs, petWeights, customActions, selectedDate);

    return {
      currentMonth,
      currentMonthLabel: dateUtil.formatDate(currentMonth, 'MMMM yyyy'),
      selectedDate,
      selectedDateStr: dateUtil.formatDate(selectedDate, 'YYYY-MM-DD'),
      blanks,
      daysInMonth,
      monthlyStats,
      combinedLogs: selectedDayData.combinedLogs,
      listTitle: selectedDayData.listTitle
    };
  },

  /**
   * 仅构建选中日期的日志数据（细粒度更新用）
   */
  _buildSelectedDayLogs(petLogs, petWeights, customActions, selectedDate) {
    const selectedDayLogs = petLogs.filter(l => dateUtil.isSameDay(dateUtil.parseISO(l.date), selectedDate));
    const selectedDayWeights = petWeights.filter(w => dateUtil.isSameDay(dateUtil.parseISO(w.date), selectedDate));

    const combinedLogs = [
      ...selectedDayLogs.map(l => {
        let label = LABEL_MAP[l.type] || '';
        let iconName = l.type;
        if (l.type.startsWith('custom_')) {
          const ca = customActions.find(c => c.id === l.type.split('_')[1]);
          label = ca ? ca.label : 'Custom';
          iconName = CUSTOM_ICON_NAMES[l.iconIdx] || 'Star';
        }
        return { ...l, typeGroup: 'log', label, iconName, iconColor: l.color || COLOR_MAP[l.type] || '#8F8377', time: dateUtil.formatDate(dateUtil.parseISO(l.date), 'HH:mm') };
      }),
      ...selectedDayWeights.map(w => ({
        ...w, typeGroup: 'weight', label: `${t('recorded_weight')}: ${w.weight} kg`, iconName: 'scale', iconColor: '#3498DB', time: dateUtil.formatDate(dateUtil.parseISO(w.date), 'HH:mm')
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const listTitle = dateUtil.isToday(selectedDate) ? t('today_logs') : `${t('logs_for')} ${dateUtil.formatDate(selectedDate, 'MMM do')}`;

    return { combinedLogs, listTitle };
  },

  // === Calendar Navigation ===
  prevMonth() {
    const state = app.getState();
    const newMonth = dateUtil.subMonths(this.data.currentMonth, 1);
    const calendarData = this._buildCalendar(state, newMonth, this.data.selectedDate, this.data.isDog);
    this.setData(calendarData);
  },

  nextMonth() {
    const state = app.getState();
    const newMonth = dateUtil.addMonths(this.data.currentMonth, 1);
    const calendarData = this._buildCalendar(state, newMonth, this.data.selectedDate, this.data.isDog);
    this.setData(calendarData);
  },

  goToday() {
    const state = app.getState();
    const today = dateUtil.startOfDay(new Date());
    const calendarData = this._buildCalendar(state, dateUtil.startOfMonth(new Date()), today, this.data.isDog);
    this.setData(calendarData);
  },

  /**
   * 选择日期 — 细粒度更新：只更新选中态 + 日志列表，不重算日历
   */
  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date;
    const date = new Date(dateStr);
    const state = app.getState();
    const petLogs = state.logs.filter(l => l.petId === state.activePetId);
    const petWeights = state.weightHistory.filter(w => w.petId === state.activePetId);
    const customActions = state.customActions.filter(ca => ca.petId === state.activePetId);
    const selectedDayData = this._buildSelectedDayLogs(petLogs, petWeights, customActions, date);

    // 更新每天的 isSelected 状态
    const daysInMonth = this.data.daysInMonth.map(d => ({
      ...d,
      isSelected: d.dateStr === dateStr
    }));

    this.setData({
      selectedDate: date,
      selectedDateStr: dateStr,
      daysInMonth,
      combinedLogs: selectedDayData.combinedLogs,
      listTitle: selectedDayData.listTitle
    });
  },

  // === Quick Actions ===
  handleAction(e) {
    const type = e.currentTarget.dataset.type;
    const label = e.currentTarget.dataset.label || LABEL_MAP[type] || type;
    const color = e.currentTarget.dataset.color || null;
    const iconIdx = e.currentTarget.dataset.iconidx !== undefined ? parseInt(e.currentTarget.dataset.iconidx) : null;

    // Apply current time to selected date
    const now = new Date();
    const targetDate = new Date(this.data.selectedDate);
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    let state = app.getState();
    state = storage.addLog(state, type, targetDate.toISOString(), '', color, iconIdx);
    app.setState(state);

    this.setData({ feedback: `Logged: ${label}` });
    setTimeout(() => this.setData({ feedback: '' }), 2000);

    this.refreshData();
  },

  handleCustomAction(e) {
    const { id, label, color, iconidx } = e.currentTarget.dataset;
    const now = new Date();
    const targetDate = new Date(this.data.selectedDate);
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    let state = app.getState();
    state = storage.addLog(state, `custom_${id}`, targetDate.toISOString(), '', color, parseInt(iconidx));
    app.setState(state);

    this.setData({ feedback: `Logged: ${label}` });
    setTimeout(() => this.setData({ feedback: '' }), 2000);

    this.refreshData();
  },

  deleteCustomAction(e) {
    const id = e.currentTarget.dataset.id;
    let state = app.getState();
    state = storage.deleteCustomAction(state, id);
    app.setState(state);
    this.refreshData();
  },

  deleteLog(e) {
    const { id, typegroup } = e.currentTarget.dataset;
    let state = app.getState();
    if (typegroup === 'weight') {
      state = storage.deleteWeight(state, id);
    } else {
      state = storage.deleteLog(state, id);
    }
    app.setState(state);
    this.refreshData();
  },

  // === Custom Modal ===
  openCustomModal() { this.setData({ showCustomModal: true, customName: '', customColor: COLORS[4], customIconIdx: 0 }); },
  closeCustomModal() { this.setData({ showCustomModal: false }); },
  onCustomNameInput(e) { this.setData({ customName: e.detail.value }); },
  selectCustomIcon(e) { this.setData({ customIconIdx: parseInt(e.currentTarget.dataset.idx) }); },
  selectCustomColor(e) { this.setData({ customColor: e.currentTarget.dataset.color }); },
  saveCustomAction() {
    if (!this.data.customName.trim()) return;
    let state = app.getState();
    state = storage.addCustomAction(state, this.data.customName, this.data.customColor, this.data.customIconIdx);
    app.setState(state);
    this.setData({ showCustomModal: false, customName: '' });
    this.refreshData();
  },

  // === Weight Modal ===
  openWeightModal() { this.setData({ showWeightModal: true, newWeight: 4.0 }); },
  closeWeightModal() { this.setData({ showWeightModal: false }); },
  onWeightSliderChange(e) { this.setData({ newWeight: (e.detail.value / 10).toFixed(1) }); },
  saveWeight() {
    const now = new Date();
    const targetDate = new Date(this.data.selectedDate);
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    let state = app.getState();
    state = storage.addWeight(state, parseFloat(this.data.newWeight), targetDate.toISOString());
    app.setState(state);
    this.setData({ showWeightModal: false, feedback: `Logged Weight: ${this.data.newWeight} kg` });
    setTimeout(() => this.setData({ feedback: '' }), 2000);
    this.refreshData();
  },

  // === Weight Chart (Canvas) ===
  drawWeightChart(data) {
    if (!data || data.length === 0) return;
    const query = wx.createSelectorQuery().in(this);
    query.select('#weightCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio;
      const width = res[0].width;
      const height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, width, height);

      const padding = { top: 20, right: 20, bottom: 30, left: 40 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const weights = data.map(d => d.weight);
      const minW = Math.min(...weights) - 0.5;
      const maxW = Math.max(...weights) + 0.5;
      const rangeW = maxW - minW || 1;

      // Grid lines
      ctx.strokeStyle = '#F0EDE6';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      // Y axis labels
      ctx.fillStyle = '#8F8377';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const val = maxW - (rangeW / 4) * i;
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(val.toFixed(1), padding.left - 5, y + 4);
      }

      // X axis labels
      ctx.textAlign = 'center';
      data.forEach((d, i) => {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
        ctx.fillText(d.displayDate, x, height - 5);
      });

      // Line
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
        const y = padding.top + chartH - ((d.weight - minW) / rangeW) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      data.forEach((d, i) => {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * i;
        const y = padding.top + chartH - ((d.weight - minW) / rangeW) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#3498DB';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }
});
