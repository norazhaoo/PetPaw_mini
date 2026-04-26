// pages/dashboard/dashboard.js
const app = getApp();
const storage = require('../../utils/storage');
const { t, getLanguage } = require('../../utils/i18n');
const dateUtil = require('../../utils/date');

// 自定义图标列表，对应 CUSTOM_ICONS 数组
const CUSTOM_ICON_NAMES = ['Star', 'Heart', 'Droplet', 'Sun', 'Zap', 'Smile', 'Music', 'Coffee', 'Camera', 'Gift', 'Umbrella', 'Book', 'Feather', 'Flame', 'Moon', 'Cloud'];
// Remove LABEL_MAP as we use t() for i18n

const COLOR_MAP = {
  vaccine: '#FF7B54', deworming: '#93C653', brush_teeth: '#5DADE2',
  scoop_litter: '#C49A6C', walk_dog: '#7EAA72', log_weight: '#6C8EBF'
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
    // Export
    exportGenerating: false,
    showExportModal: false,
    exportImageUrl: '',
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
        today_logs: t('today_logs'), logs_for: t('logs_for'),
        dog: t('dog'), cat: t('cat'), pawfile: t('pawfile'), today: t('today'),
        vaccine: t('vaccine'), deworming: t('deworming'), brush_teeth: t('brush_teeth'),
        scoop_litter: t('scoop_litter'), walk_dog: t('walk_dog'),
        custom: t('custom'), done: t('done'), d: t('d'),
        months: t('months'), weekdays: t('weekdays'),
        export_report: t('export_report'), exporting: t('exporting'),
        export_fail: t('export_fail'), export_success: t('export_success')
      },
      weekdays: t('weekdays') || WEEKDAYS
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
      this.getTabBar().updateLang();
    }
    // Set navigation title
    wx.setNavigationBarTitle({ title: t('diary') || 'Diary' });

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
    const isCat = activePet.species === 'cat';
    const quickActions = isDog
      ? ['vaccine', 'deworming', 'brush_teeth', 'log_weight', 'walk_dog']
      : isCat
        ? ['vaccine', 'deworming', 'brush_teeth', 'log_weight', 'scoop_litter']
        : ['vaccine', 'deworming', 'brush_teeth', 'log_weight'];

    // 过滤掉被用户隐藏的动作
    const hidden = activePet.hiddenActions || [];
    const isEditingActions = this.data.isEditingActions || false;

    // Hidden built-in actions should disappear immediately after deletion.
    const filteredQuickActions = quickActions
      .map(type => {
        let iconName = type;
        if (type === 'log_weight') iconName = 'scale';
        if (type === 'walk_dog') iconName = 'walk_dog';
        if (type === 'scoop_litter') iconName = 'scoop_litter';

        return {
          type,
          color: COLOR_MAP[type] || '#8F8377',
          iconName,
          hidden: hidden.includes(type)
        };
      })
      .filter(item => !item.hidden);

    const customActions = state.customActions.filter(ca => ca.petId === state.activePetId).map(ca => ({
      ...ca, iconName: CUSTOM_ICON_NAMES[ca.iconIdx] || CUSTOM_ICON_NAMES[0]
    }));

    // Stock Alert - only for active pet and visible items
    const petInventory = (state.inventoryItems || [])
      .filter(item => item.petId === state.activePetId && !item.hidden);

    const TIME_CONV = { 'day': 1, 'week': 7, 'month': 30, 'quarter': 91, 'year': 365 };
    const UNIT_CONV = {
      'g': { 'kg': 0.001, 'g': 1 },
      'kg': { 'g': 1000, 'kg': 1 },
      'ml': { 'L': 0.001, 'ml': 1 },
      'L': { 'ml': 1000, 'L': 1 }
    };

    // Inventory items with computed daysLeft and translated labels
    const inventoryItems = petInventory.map(item => {
      const amount = item.consumptionAmount || item.dailyConsumption || 0;
      const intervalVal = item.consumptionInterval || 1;
      const timeUnit = item.consumptionTimeUnit || 'day';
      const daysInCycle = intervalVal * (TIME_CONV[timeUnit] || 1);

      const cUnit = item.consumptionUnit || item.unit || 'g';
      const tUnit = item.unit || 'g';

      let dailyInTotalUnit = amount / daysInCycle;
      if (cUnit !== tUnit && UNIT_CONV[cUnit] && UNIT_CONV[cUnit][tUnit]) {
        dailyInTotalUnit = (amount * UNIT_CONV[cUnit][tUnit]) / daysInCycle;
      }

      const daysLeft = Math.floor((item.current || 0) / (dailyInTotalUnit || 0.0001));

      const fullLabel = item.typeId ? (t('stock_' + item.typeId) || item.label) : item.label;
      const shortLabel = fullLabel.replace(/ .*/, '');

      // Assign theme colors
      let color = '#8F8377';
      if (item.typeId === 'food') color = '#D35400'; // Warm orange
      if (item.typeId === 'litter' || item.typeId === 'litter_2') color = '#C49A6C'; // Dirt/sand brown
      if (item.typeId === 'treats') color = '#F39C12'; // Bright amber

      return { ...item, daysLeft: Math.max(0, daysLeft), isLow: daysLeft <= 7, shortLabel, color };
    });

    const showWarning = inventoryItems.some(item => item.isLow) || false;

    // 判断"上次铲屎/遛狗"是否显示（与日常追踪联动）
    const actionType = isDog ? 'walk_dog' : 'scoop_litter';
    const showLastAction = (isDog || isCat) && !hidden.includes(actionType);

    // === 第一阶段：先渲染头部、快速操作等轻量数据 ===
    this.setData({
      activePet,
      isDog,
      isCat,
      showLastAction,
      isEditingActions,
      quickActions: filteredQuickActions,
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
      lastActionText: lastActionText
        .replace(' minutes', t('m')).replace(' minute', t('m'))
        .replace(' hours', t('h')).replace(' hour', t('h'))
        .replace(' days', t('d')).replace(' day', t('d')),
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
    const _key = (dateStr) => dateUtil.formatDate(dateUtil.parseISO(dateStr), 'YYYY-MM-DD');

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
        let label = t(key) || '';
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
      currentMonthLabel: dateUtil.formatDate(currentMonth, 'MMMM yyyy', {
        months: this.data.i18n.months,
        isZH: getLanguage() === 'zh'
      }),
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
        let label = t(l.type) || '';
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

    const isZH = getLanguage() === 'zh';
    const listTitle = dateUtil.isToday(selectedDate)
      ? t('today_logs')
      : `${t('logs_for')} ${dateUtil.formatDate(selectedDate, 'MMM do', {
        isZH,
        monthsShort: this.data.i18n.months
      })}`;

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
    if (this.data.isEditingActions) return;

    const type = e.currentTarget.dataset.type;
    const label = e.currentTarget.dataset.label || t(type) || type;

    if (type === 'log_weight') {
      this.openWeightModal();
      return;
    }

    const color = e.currentTarget.dataset.color || null;
    const iconIdx = e.currentTarget.dataset.iconidx !== undefined ? parseInt(e.currentTarget.dataset.iconidx) : null;

    // Apply current time to selected date
    const now = new Date();
    const targetDate = new Date(this.data.selectedDate);
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    let state = app.getState();
    state = storage.addLog(state, type, targetDate.toISOString(), '', color, iconIdx);
    app.setState(state);

    this.setData({ feedback: `${t('logged')}: ${label}` });
    setTimeout(() => this.setData({ feedback: '' }), 2000);

    this.refreshData();
  },

  handleCustomAction(e) {
    if (this.data.isEditingActions) return;

    const { id, label, color, iconidx } = e.currentTarget.dataset;
    const now = new Date();
    const targetDate = new Date(this.data.selectedDate);
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    let state = app.getState();
    state = storage.addLog(state, `custom_${id}`, targetDate.toISOString(), '', color, parseInt(iconidx));
    app.setState(state);

    this.setData({ feedback: `${t('logged')}: ${label}` });
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

  // === Edit Actions Mode ===
  startEditActions() {
    this.setData({ isEditingActions: true });
    // 可以加一个震动触感反馈
    if (wx.vibrateShort) wx.vibrateShort();
  },

  stopEditActions() {
    this.setData({ isEditingActions: false });
  },

  hideQuickAction(e) {
    const { type } = e.currentTarget.dataset;
    let state = app.getState();
    const pet = state.pets.find(p => p.id === state.activePetId);
    if (pet) {
      if (!pet.hiddenActions) pet.hiddenActions = [];
      const idx = pet.hiddenActions.indexOf(type);
      if (idx > -1) {
        pet.hiddenActions.splice(idx, 1);
      } else {
        pet.hiddenActions.push(type);
      }
      state = storage.editPet(state, pet.id, { hiddenActions: pet.hiddenActions });
      app.setState(state);
      this.refreshData();
    }
  },

  // === Custom Modal ===
  openCustomModal() {
    if (this.data.isEditingActions) return;
    this.setData({ showCustomModal: true, customName: '', customColor: COLORS[4], customIconIdx: 0 });
  },
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
  noop() { },
  closeWeightModal() { this.setData({ showWeightModal: false }); },
  onWeightSliderChange(e) { this.setData({ newWeight: (e.detail.value / 10).toFixed(1) }); },
  onWeightInput(e) { this.setData({ newWeight: e.detail.value }); },
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
  },

  // ============================================================
  // === EXPORT REPORT ENGINE — Apple Style 5-Section Report ====
  // ============================================================

  exportReport() {
    this.setData({ exportGenerating: true, showExportModal: false });
    // Give the loading overlay time to render before heavy canvas work
    setTimeout(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#exportCanvas').fields({ node: true, size: true }).exec(async (res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ exportGenerating: false });
          wx.showToast({ title: t('export_fail') || '生成失败', icon: 'none' });
          return;
        }
        const canvas = res[0].node;
        const W = 750;  // logical pixels
        const H = 1860;
        const info = wx.getSystemInfoSync();
        const dpr = info.pixelRatio || 2;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        try {
          await this._drawAppleReport(canvas, ctx, W, H);

          wx.canvasToTempFilePath({
            canvas,
            destWidth:  W * 3,
            destHeight: H * 3,
            fileType: 'png',
            success: (r) => {
              this.setData({ exportGenerating: false, exportImageUrl: r.tempFilePath, showExportModal: true });
            },
            fail: (err) => {
              this.setData({ exportGenerating: false });
              console.error('canvasToTempFilePath fail', err);
              wx.showToast({ title: t('export_fail') || '生成失败', icon: 'none' });
            }
          }, this);
        } catch (err) {
          this.setData({ exportGenerating: false });
          console.error('draw error', err);
          wx.showToast({ title: t('export_fail') || '生成失败', icon: 'none' });
        }
      });
    }, 100);
  },

  closeExportModal() { this.setData({ showExportModal: false }); },

  previewExportImage() {
    if (this.data.exportImageUrl) {
      wx.previewImage({ urls: [this.data.exportImageUrl] });
    }
  },

  saveExportImage() {
    if (!this.data.exportImageUrl) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.exportImageUrl,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({ title: '需要权限', content: '请在设置中允许访问相册', confirmText: '去设置',
            success: (res) => { if (res.confirm) wx.openSetting(); }
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  },

  // ─── Master drawing orchestrator ───────────────────────────
  async _drawAppleReport(canvas, ctx, W, H) {
    const state = app.getState();
    const pet   = this.data.activePet;
    if (!pet) return;

    const petLogs     = state.logs.filter(l => l.petId === state.activePetId);
    const petWeights  = state.weightHistory.filter(w => w.petId === state.activePetId);
    const petMeds     = state.medicalRecords.filter(m => m.petId === state.activePetId);
    const petInventory = (state.inventoryItems || []).filter(i => i.petId === state.activePetId && !i.hidden);
    const petReminders = (state.reminders || []).filter(r => r.petId === state.activePetId && !r.done);
    const currentMonth = this.data.currentMonth || dateUtil.startOfMonth(new Date());
    const isZH = getLanguage() === 'zh';

    const MARGIN = 40;
    const CARD_W = W - MARGIN * 2;
    const BG    = '#F9F7F4';
    const CARD  = '#FFFFFF';
    const INK   = '#1C1C1E';   // near-black
    const MUTED = '#6E6E73';   // Apple gray
    const ACCENT= '#FEE140';   // PetPaw yellow

    // ── Background ────────────────────────────────────────────
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ── Soft top arc decoration ───────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, W, 320);
    grad.addColorStop(0, '#FEE140');
    grad.addColorStop(1, '#FFD580');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 200);
    ctx.quadraticCurveTo(W / 2, 360, 0, 200);
    ctx.closePath();
    ctx.fill();

    let cursorY = 0;

    // ── Section 1: Pet Profile ────────────────────────────────
    cursorY = await this._drawProfileSection(canvas, ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, ACCENT, pet, petWeights, cursorY, isZH);

    // ── Section 2: Activity Highlights ───────────────────────
    cursorY = this._drawActivitySection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petLogs, currentMonth, cursorY, isZH);

    // ── Section 3: Health & Weight ────────────────────────────
    cursorY = this._drawHealthSection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petWeights, petMeds, currentMonth, cursorY, isZH);

    // ── Section 4: Supply Snapshot ────────────────────────────
    cursorY = this._drawSupplySection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petInventory, cursorY);

    // ── Section 5: Reminders & Quote ─────────────────────────
    this._drawFooterSection(ctx, W, MARGIN, CARD_W, INK, MUTED, ACCENT, petReminders, petLogs, cursorY, isZH);
  },

  // ─── Section 1: Profile ─────────────────────────────────────
  async _drawProfileSection(canvas, ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, ACCENT, pet, petWeights, startY, isZH) {
    // Pet avatar — centered at top
    const avatarR = 72;
    const avatarCX = W / 2;
    const avatarCY = 96;

    if (pet.avatar) {
      try {
        const img = canvas.createImage();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = pet.avatar; });
        ctx.save();
        ctx.beginPath(); ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
        ctx.restore();
      } catch (e) { /* fall through to emoji */ }
    }
    // Avatar ring
    ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2); ctx.stroke();
    // Emoji fallback if no avatar loaded
    if (!pet.avatar) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2); ctx.fill();
      ctx.font = '72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pet.species === 'dog' ? '🐶' : '🐱', avatarCX, avatarCY);
    }

    // Pet name
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK; ctx.font = 'bold 52px -apple-system,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(pet.name || '', W / 2, 210);

    // Breed
    ctx.fillStyle = MUTED; ctx.font = '26px -apple-system,sans-serif';
    const breed = pet.breed || (pet.species === 'dog' ? t('dog') : pet.species === 'cat' ? t('cat') : '');
    ctx.fillText(breed, W / 2, 244);

    // Card starts here
    const cardY = 278;  const cardH = 170;
    this.drawCardSection(ctx, MARGIN, cardY, CARD_W, cardH, 32, CARD);

    // Companion days
    const daysOld = pet.birthday
      ? Math.max(0, dateUtil.differenceInDays(new Date(), dateUtil.parseISO(pet.birthday)))
      : null;
    const ageYears = daysOld !== null ? (daysOld / 365).toFixed(1) : null;

    // Latest weight + trend
    const weights = petWeights.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestW = weights.length > 0 ? weights[weights.length - 1].weight : null;
    const prevW   = weights.length > 1 ? weights[weights.length - 2].weight : null;
    const trend   = latestW !== null && prevW !== null ? (latestW > prevW ? '↑' : latestW < prevW ? '↓' : '—') : '';
    const trendColor = trend === '↑' ? '#FF6B6B' : trend === '↓' ? '#4CD964' : MUTED;

    // Three info pills inside card
    const pills = [];
    if (daysOld !== null) pills.push({ label: isZH ? '已陪伴' : 'With you', value: `${daysOld}${isZH ? '天' : 'd'}` });
    if (ageYears !== null) pills.push({ label: isZH ? '年龄' : 'Age', value: `${ageYears}${isZH ? '岁' : 'y'}` });
    if (latestW !== null) pills.push({ label: isZH ? '体重' : 'Weight', value: `${latestW}kg`, extra: trend, extraColor: trendColor });

    const pillW = CARD_W / Math.max(pills.length, 1);
    pills.forEach((p, i) => {
      const cx = MARGIN + pillW * i + pillW / 2;
      // Divider
      if (i > 0) { ctx.strokeStyle = '#F0EFEA'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(MARGIN + pillW * i, cardY + 28); ctx.lineTo(MARGIN + pillW * i, cardY + cardH - 28); ctx.stroke(); }
      // Value
      ctx.fillStyle = INK; ctx.font = 'bold 40px -apple-system,sans-serif'; ctx.textAlign = 'center';
      const valX = p.extra ? cx - 14 : cx;
      ctx.fillText(p.value, valX, cardY + 88);
      // Trend arrow
      if (p.extra) { ctx.fillStyle = p.extraColor; ctx.font = 'bold 32px sans-serif'; ctx.fillText(p.extra, cx + (p.value.length * 14), cardY + 88); }
      // Label
      ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif';
      ctx.fillText(p.label, cx, cardY + 125);
    });

    return cardY + cardH + 28;
  },

  // ─── Section 2: Activity Highlights ─────────────────────────
  _drawActivitySection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petLogs, currentMonth, startY, isZH) {
    const GAP = 20;
    const cardH_top = 200;   // event counts row
    const cardH_cal = 180;   // mini calendar heatmap

    // ── Event count card ──────────────────────────────────────
    const monthLogs = petLogs.filter(l => dateUtil.isSameMonth(dateUtil.parseISO(l.date), currentMonth));
    const statsMap = {};
    monthLogs.forEach(l => {
      const k = l.type;
      if (!statsMap[k]) statsMap[k] = { count: 0, label: '', color: COLOR_MAP[k] || '#FEE140' };
      // Build label
      if (!statsMap[k].label) {
        if (k.startsWith('custom_')) {
          const ca = (app.getState().customActions || []).find(c => c.id === k.split('_')[1]);
          statsMap[k].label = ca ? ca.label : 'Custom';
        } else {
          statsMap[k].label = t(k) || k;
        }
      }
      statsMap[k].count++;
    });
    const stats = Object.values(statsMap).sort((a, b) => b.count - a.count).slice(0, 6);

    // section label
    ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif'; ctx.textAlign = 'left';
    const totalCount = monthLogs.length;
    ctx.fillText((isZH ? `本月足迹 (${totalCount})` : `THIS MONTH (${totalCount})`).toUpperCase(), MARGIN, startY + 0);

    const card1Y = startY + 22;
    this.drawCardSection(ctx, MARGIN, card1Y, CARD_W, cardH_top, 32, CARD);

    if (stats.length === 0) {
      ctx.fillStyle = MUTED; ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t('no_activity') || '暂无记录', W / 2, card1Y + cardH_top / 2);
    } else {
      const cols = Math.min(stats.length, 3);
      const colW = CARD_W / cols;
      stats.slice(0, 6).forEach((s, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = MARGIN + colW * col + colW / 2;
        const baseY = card1Y + 58 + row * 92;
        // Color dot
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(cx, baseY - 10, 7, 0, Math.PI * 2); ctx.fill();
        // Count
        ctx.fillStyle = INK; ctx.font = 'bold 36px -apple-system,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${s.count}`, cx, baseY + 24);
        // Label
        ctx.fillStyle = MUTED; ctx.font = '20px -apple-system,sans-serif';
        // Truncate label
        const shortened = s.label.length > 6 ? s.label.slice(0, 5) + '…' : s.label;
        ctx.fillText(shortened, cx, baseY + 50);
      });
    }

    // ── Mini Heatmap Calendar ──────────────────────────────────
    const cal2Y = card1Y + cardH_top + GAP;
    this.drawCardSection(ctx, MARGIN, cal2Y, CARD_W, cardH_cal, 32, CARD);

    // Build heatmap data
    const firstDay = dateUtil.startOfMonth(currentMonth);
    const lastDay  = dateUtil.endOfMonth(currentMonth);
    const days     = dateUtil.eachDayOfInterval(firstDay, lastDay);
    const logCountMap = {};
    petLogs.forEach(l => {
      const k = dateUtil.formatDate(dateUtil.parseISO(l.date), 'YYYY-MM-DD');
      logCountMap[k] = (logCountMap[k] || 0) + 1;
    });

    const totalDays = days.length;
    const dotR = 7;
    const dotSpacingX = (CARD_W - 48) / Math.min(totalDays, 16);
    const ROWS = Math.ceil(totalDays / 16);
    const dotSpacingY = (cardH_cal - 52) / ROWS;
    const startDotX = MARGIN + 24 + dotSpacingX / 2;
    const startDotY = cal2Y + 30;

    // Month label inside card
    ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif'; ctx.textAlign = 'left';
    const monthLabel = isZH ? `${currentMonth.getFullYear()}年${currentMonth.getMonth()+1}月` : dateUtil.formatDate(currentMonth, 'MMMM yyyy');
    ctx.fillText(monthLabel, MARGIN + 24, cal2Y + 24);

    days.forEach((day, i) => {
      const col = i % 16;
      const row = Math.floor(i / 16);
      const cx = startDotX + col * dotSpacingX;
      const cy = startDotY + 30 + row * dotSpacingY;
      const k  = dateUtil.formatDate(day, 'YYYY-MM-DD');
      const count = logCountMap[k] || 0;
      // Heatmap color intensity
      const alpha = count > 0 ? Math.min(0.15 + count * 0.18, 1) : 0.08;
      ctx.fillStyle = count > 0 ? `rgba(254,225,64,${alpha})` : '#F0EFEA';
      ctx.strokeStyle= count > 0 ? `rgba(200,170,0,${alpha * 0.5})` : 'transparent';
      ctx.lineWidth  = 1;
      ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill(); if (count > 0) ctx.stroke();
      // Today dot highlight
      if (dateUtil.isToday(day)) {
        ctx.strokeStyle = '#1C1C1E'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, dotR + 2, 0, Math.PI * 2); ctx.stroke();
      }
    });

    return cal2Y + cardH_cal + 36;
  },

  // ─── Section 3: Health & Growth ─────────────────────────────
  _drawHealthSection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petWeights, petMeds, currentMonth, startY, isZH) {
    const cardH = 220;
    ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText((isZH ? '健康与成长' : 'Health & Growth').toUpperCase(), MARGIN, startY);

    const cardY = startY + 22;
    this.drawCardSection(ctx, MARGIN, cardY, CARD_W, cardH, 32, CARD);

    // Weight mini sparkline
    const sorted = petWeights.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const recent = sorted.slice(-8);

    const monthWeights = sorted.filter(w => dateUtil.isSameMonth(dateUtil.parseISO(w.date), currentMonth));
    const avgWeight = monthWeights.length > 0
      ? (monthWeights.reduce((s, w) => s + w.weight, 0) / monthWeights.length).toFixed(1)
      : null;

    // Left: weight info
    ctx.textAlign = 'left';
    if (avgWeight) {
      ctx.fillStyle = INK; ctx.font = 'bold 44px -apple-system,sans-serif';
      ctx.fillText(`${avgWeight} kg`, MARGIN + 24, cardY + 76);
      ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif';
      ctx.fillText(isZH ? '本月平均体重' : 'Monthly avg.', MARGIN + 24, cardY + 108);
    } else {
      ctx.fillStyle = MUTED; ctx.font = '26px -apple-system,sans-serif';
      ctx.fillText(isZH ? '暂无体重记录' : 'No weight data', MARGIN + 24, cardY + 76);
    }

    // Medical summary row
    const monthMeds = petMeds.filter(m => dateUtil.isSameMonth(dateUtil.parseISO(m.date), currentMonth));
    const monthVaccine  = petMeds.filter(m => dateUtil.isSameMonth(dateUtil.parseISO(m.date), currentMonth) && m.tags && m.tags.includes('vaccine'));
    const allLogs = app.getState().logs.filter(l => l.petId === app.getState().activePetId);
    const monthVacLog   = allLogs.filter(l => dateUtil.isSameMonth(dateUtil.parseISO(l.date), currentMonth) && l.type === 'vaccine');
    const monthDeworm   = allLogs.filter(l => dateUtil.isSameMonth(dateUtil.parseISO(l.date), currentMonth) && l.type === 'deworming');

    let healthBadges = [];
    if (monthVacLog.length > 0) healthBadges.push(`💉 疫苗 ×${monthVacLog.length}`);
    if (monthDeworm.length > 0) healthBadges.push(`🌿 驱虫 ×${monthDeworm.length}`);
    if (monthMeds.length > 0)   healthBadges.push(`🏥 就医 ×${monthMeds.length}`);
    if (healthBadges.length === 0) healthBadges.push(isZH ? '✅ 本月状态：健康' : '✅ Status: Healthy');

    ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif';
    ctx.fillText(healthBadges.join('  '), MARGIN + 24, cardY + 145);

    // Right: mini sparkline (right half of card)
    if (recent.length >= 2) {
      const sparkX = MARGIN + CARD_W * 0.48;
      const sparkW = CARD_W * 0.48 - 16;
      const sparkY = cardY + 28;
      const sparkH = cardH - 56;
      const vals = recent.map(w => w.weight);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const rangeV = maxV - minV || 0.5;
      const toX = (i) => sparkX + (i / (recent.length - 1)) * sparkW;
      const toY = (v) => sparkY + sparkH - ((v - minV) / rangeV) * sparkH;

      // Gradient fill under curve
      const sfill = ctx.createLinearGradient(0, sparkY, 0, sparkY + sparkH);
      sfill.addColorStop(0, 'rgba(254,225,64,0.35)');
      sfill.addColorStop(1, 'rgba(254,225,64,0.0)');
      ctx.fillStyle = sfill;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(recent[0].weight));
      recent.forEach((w, i) => { if (i > 0) ctx.lineTo(toX(i), toY(w.weight)); });
      ctx.lineTo(toX(recent.length - 1), sparkY + sparkH);
      ctx.lineTo(toX(0), sparkY + sparkH);
      ctx.closePath(); ctx.fill();

      // Trend line
      ctx.strokeStyle = '#F0C000'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath();
      recent.forEach((w, i) => { i === 0 ? ctx.moveTo(toX(i), toY(w.weight)) : ctx.lineTo(toX(i), toY(w.weight)); });
      ctx.stroke();

      // Dots
      recent.forEach((w, i) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#F0C000'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(toX(i), toY(w.weight), 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
    }

    return cardY + cardH + 36;
  },

  // ─── Section 4: Supply Snapshot ─────────────────────────────
  _drawSupplySection(ctx, W, MARGIN, CARD_W, CARD, INK, MUTED, petInventory, startY) {
    const SUPPLY_COLORS = { food: '#F5A623', litter: '#C49A6C', treats: '#FF7B54' };
    const items = petInventory
      .filter(i => i.typeId === 'food' || i.typeId === 'litter' || i.typeId === 'treats')
      .slice(0, 3);
    if (items.length === 0) return startY;  // skip if no supply data

    const TIME_CONV = { 'day': 1, 'week': 7, 'month': 30, 'quarter': 91, 'year': 365 };
    const cardH = 60 + items.length * 80 + 20;

    ctx.fillStyle = MUTED; ctx.font = '22px -apple-system,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('物资守护'.toUpperCase(), MARGIN, startY);

    const cardY = startY + 22;
    this.drawCardSection(ctx, MARGIN, cardY, CARD_W, cardH, 32, CARD);

    items.forEach((item, i) => {
      const rowY = cardY + 48 + i * 80;
      // Compute daysLeft
      const amount = item.consumptionAmount || item.dailyConsumption || 0;
      const intervalDays = (item.consumptionInterval || 1) * (TIME_CONV[item.consumptionTimeUnit || 'day'] || 1);
      const daily = amount / (intervalDays || 1);
      const daysLeft = daily > 0 ? Math.floor((item.current || 0) / daily) : 999;

      const barW = CARD_W - 48 - 120;
      const fill = Math.max(0, Math.min(1, daysLeft / 30));
      const color = SUPPLY_COLORS[item.typeId] || '#FEE140';
      const label = t('stock_' + item.typeId) || item.label || '';
      const isLow = daysLeft <= 7;

      // Label
      ctx.fillStyle = INK; ctx.font = '26px -apple-system,sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, MARGIN + 24, rowY);

      // Days left text
      ctx.fillStyle = isLow ? '#FF3B30' : MUTED;
      ctx.font = isLow ? 'bold 22px sans-serif' : '22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(isLow ? `仅剩 ${daysLeft} 天 ⚠️` : `${daysLeft} 天`, MARGIN + CARD_W - 24, rowY);

      // Progress bar background
      const barX = MARGIN + 24; const barY = rowY + 14; const barH = 8;
      ctx.fillStyle = '#F0EFEA'; this.drawRoundedBarPath(ctx, barX, barY, barW, barH, 4);
      // Progress bar fill
      ctx.fillStyle = color; this.drawRoundedBarPath(ctx, barX, barY, Math.max(barW * fill, 4), barH, 4);
    });

    return cardY + cardH + 36;
  },

  // ─── Section 5: Reminders & Quote ───────────────────────────
  _drawFooterSection(ctx, W, MARGIN, CARD_W, INK, MUTED, ACCENT, petReminders, petLogs, startY, isZH) {
    const cardH = 200;
    this.drawCardSection(ctx, MARGIN, startY, CARD_W, cardH, 32, '#FFFFFF');

    // Next reminder
    const nextReminder = petReminders
      .filter(r => r.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    if (nextReminder) {
      const dueStr = dateUtil.formatDate(dateUtil.parseISO(nextReminder.dueDate), 'YYYY-MM-DD');
      const reminderLabel = t(nextReminder.type) || nextReminder.type;
      ctx.fillStyle = INK; ctx.font = 'bold 28px -apple-system,sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`📅 下次${reminderLabel}：${dueStr}`, MARGIN + 24, startY + 54);
    }

    // Random quote from logs
    const notedLogs = petLogs.filter(l => l.note && l.note.trim().length > 2);
    const quote = notedLogs.length > 0
      ? notedLogs[Math.floor(Math.random() * notedLogs.length)].note
      : (isZH ? '愿你与它，每天都是好日子。' : 'Every day with them is a gift.');
    ctx.fillStyle = MUTED; ctx.font = 'italic 24px -apple-system,sans-serif';
    const shortQuote = quote.length > 28 ? quote.slice(0, 27) + '…' : quote;
    ctx.fillText(`"${shortQuote}"`, MARGIN + 24, startY + 100);

    // ─── Brand Footer (Outside Card, at the very bottom) ────────
    const footerY = 1860 - 80; // Near the bottom edge
    ctx.textAlign = 'center';
    
    // Tiny heart deco
    ctx.fillStyle = '#FF7B54'; ctx.font = '24px sans-serif';
    ctx.fillText('❤', W / 2, footerY - 45);

    ctx.fillStyle = '#B0ADA6'; ctx.font = 'bold 22px -apple-system,sans-serif';
    ctx.fillText('PetPaw', W / 2, footerY);
    
    ctx.font = '20px -apple-system,sans-serif';
    ctx.fillText('记录宠物生活的每一天', W / 2, footerY + 32);

    // Date stamp
    ctx.fillStyle = '#C7C4BC'; ctx.font = '18px sans-serif';
    ctx.fillText(dateUtil.formatDate(new Date(), 'YYYY-MM-DD'), W / 2, footerY + 60);
  },

  // ─── Drawing Helpers ─────────────────────────────────────────
  drawCardSection(ctx, x, y, w, h, r, color) {
    ctx.shadowColor    = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur     = 24;
    ctx.shadowOffsetY  = 8;
    ctx.fillStyle = color;
    this.drawRoundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  },

  drawRoundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  drawRoundedBarPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
});
