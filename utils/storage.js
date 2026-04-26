// utils/storage.js - 数据存储管理（异步写盘 + 防抖优化版）

const { generateId } = require('./util');
const { differenceInDays } = require('./date');

const STORAGE_KEY = 'petpaw_data';

const defaultState = {
  activePetId: null,
  pets: [],
  inventoryItems: [], // 实际物资由 _syncDefaultInventory 根据宠物种类决定
  lastDeductionDate: new Date().toISOString(),
  logs: [],
  reminders: [],
  weightHistory: [],
  medicalRecords: [],
  customActions: []
};

// ======== 异步写盘 + 防抖 ========
let _saveTimer = null;

function _debouncedSave(state) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    _saveTimer = null;
    wx.setStorage({
      key: STORAGE_KEY,
      data: state,
      fail: function(e) { console.error('Async save failed:', e); }
    });
  }, 300);
}

/**
 * 保存数据（异步 + 300ms 防抖）
 * 连续多次操作只触发一次磁盘写入
 */
function saveState(state) {
  _debouncedSave(state);
}

/**
 * 强制立即持久化（应用切后台时调用）
 */
function flushState(state) {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  try {
    wx.setStorageSync(STORAGE_KEY, state);
  } catch (e) {
    console.error('Flush save failed:', e);
  }
}

/**
 * 根据所有宠物，确保每只宠物都有正确的默认物资（幂等）
 * - 编规：猫 = food+litter, 狗 = food
 * - 每个默认 item 都带 petId
 * - 自定义 item（用户手动添加）保留不动
 */
function _syncDefaultInventory(items, pets) {
  // 保留所有自定义项（带 petId 且 id 不是默认类型）
  const DEFAULT_TYPE = ['food', 'litter'];
  const custom = items.filter(i => !DEFAULT_TYPE.includes(i.typeId));

  const defaults = [];
  for (const pet of pets) {
    // food
    const existFood = items.find(i => i.petId === pet.id && i.typeId === 'food');
    defaults.push(existFood || { id: generateId(), petId: pet.id, typeId: 'food', label: 'Food', current: 0, consumptionAmount: 50, consumptionInterval: 1, consumptionTimeUnit: 'day', consumptionUnit: 'g', icon: 'FoodBowl', color: '#F5B041', unit: 'g', hidden: false });

    // litter 仅猫
    if (pet.species === 'cat' || !pet.species) {
      const existLitter = items.find(i => i.petId === pet.id && i.typeId === 'litter');
      defaults.push(existLitter || { id: generateId(), petId: pet.id, typeId: 'litter', label: 'Litter', current: 0, consumptionAmount: 200, consumptionInterval: 1, consumptionTimeUnit: 'day', consumptionUnit: 'g', icon: 'LitterBox', color: '#AAB7B8', unit: 'g', hidden: false });
    }
  }

  return [...defaults, ...custom];
}

/**
 * 加载数据（同步读取，冷启动必须）
 */
function loadState() {
  try {
    const saved = wx.getStorageSync(STORAGE_KEY);
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (!parsed.pets) parsed.pets = [];
      if (!parsed.customActions) parsed.customActions = [];
      if (!parsed.weightHistory) parsed.weightHistory = [];
      if (!parsed.medicalRecords) parsed.medicalRecords = [];
      if (!parsed.logs) parsed.logs = [];
      if (!parsed.reminders) parsed.reminders = [];

      // 迁移旧数据结构
      if (parsed.inventory && !parsed.inventoryItems) {
        parsed.inventoryItems = [
          { id: 'food', label: 'Food', current: parsed.inventory.food?.current || 0, dailyConsumption: parsed.inventory.food?.dailyConsumption || 50, icon: 'Package', color: '#F5B041', unit: 'g' },
          { id: 'litter', label: 'Litter', current: parsed.inventory.litter?.current || 0, dailyConsumption: parsed.inventory.litter?.dailyConsumption || 200, icon: 'Archive', color: '#AAB7B8', unit: 'g' },
          { id: 'treats', label: 'Treats', current: 0, dailyConsumption: 1, icon: 'Heart', color: '#F1948A', unit: 'bag' }
        ];
        delete parsed.inventory;
      } else if (!parsed.inventoryItems) {
        parsed.inventoryItems = JSON.parse(JSON.stringify(defaultState.inventoryItems));
      }

      const activePetId = parsed.activePetId || (parsed.pets && parsed.pets[0]?.id) || null;
      parsed.inventoryItems = (parsed.inventoryItems || []).map(item => {
        if (!item.petId && activePetId) {
          // 推断 typeId 并修正图标
          const typeId = item.id === 'food' ? 'food' : item.id === 'litter' ? 'litter' : null;
          const icon = typeId === 'food' ? 'FoodBowl' : typeId === 'litter' ? 'LitterBox' : item.icon;
          return { ...item, petId: activePetId, typeId: typeId || item.typeId || null, icon };
        }
        // 修正已有 default item 的图标（以防旧存档带错误图标）
        if (item.typeId === 'food' && (item.icon === 'Package' || item.icon === 'Fish')) return { ...item, icon: 'FoodBowl' };
        if (item.typeId === 'litter' && (item.icon === 'Archive' || item.icon === 'scoop_litter')) return { ...item, icon: 'LitterBox' };
        return item;
      });

      // 同步默认物资
      parsed.inventoryItems = _syncDefaultInventory(parsed.inventoryItems, parsed.pets || []);

      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

/**
 * 执行库存自动扣减
 */
function performDailyDeduction(state) {
  const today = new Date();
  const lastDeduction = new Date(state.lastDeductionDate || today.toISOString());
  const daysPassed = differenceInDays(today, lastDeduction);

  if (daysPassed > 0) {
    const CONVERSION = {
      'g': { 'kg': 0.001, 'g': 1 },
      'kg': { 'g': 1000, 'kg': 1 },
      'ml': { 'L': 0.001, 'ml': 1 },
      'L': { 'ml': 1000, 'L': 1 }
    };
    const TIME_CONVERSION = {
      'day': 1,
      'week': 7,
      'month': 30,
      'quarter': 91,
      'year': 365
    };

    state.inventoryItems = state.inventoryItems.map(item => {
      const amount = item.consumptionAmount || item.dailyConsumption || 0;
      const intervalVal = item.consumptionInterval || 1;
      const timeUnit = item.consumptionTimeUnit || 'day';
      const intervalInDays = intervalVal * (TIME_CONVERSION[timeUnit] || 1);

      const cUnit = item.consumptionUnit || item.unit || 'g';
      const tUnit = item.unit || 'g';

      let dailyAmountInTotalUnit = amount / intervalInDays;
      
      // Unit conversion
      if (cUnit !== tUnit) {
        if (CONVERSION[cUnit] && CONVERSION[cUnit][tUnit]) {
          dailyAmountInTotalUnit = (amount * CONVERSION[cUnit][tUnit]) / intervalInDays;
        }
      }

      return {
        ...item,
        current: Math.max(0, item.current - (dailyAmountInTotalUnit * daysPassed))
      };
    });
    state.lastDeductionDate = today.toISOString();
    saveState(state);
  }
  return state;
}

// ======== 数据操作方法 ========

function setActivePetId(state, id) {
  state.activePetId = id;
  saveState(state);
  return state;
}

function addPet(state, petData) {
  const id = generateId();
  const newPet = { ...petData, id };

  state.pets = [...state.pets, newPet];
  state.activePetId = id;
  state.inventoryItems = _syncDefaultInventory(state.inventoryItems, state.pets);

  if (petData.initialWeight) {
    const entry = { id: generateId(), petId: id, date: new Date().toISOString(), weight: parseFloat(petData.initialWeight) };
    state.weightHistory = [...state.weightHistory, entry].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  saveState(state);
  return state;
}

function editPet(state, id, petData) {
  state.pets = state.pets.map(p => p.id === id ? { ...p, ...petData } : p);
  saveState(state);
  return state;
}

function deletePet(state, id) {
  state.pets = state.pets.filter(p => p.id !== id);
  // 删除该宠物的所有物资
  state.inventoryItems = state.inventoryItems.filter(i => i.petId !== id);
  if (state.activePetId === id) {
    state.activePetId = state.pets.length > 0 ? state.pets[0].id : null;
  }
  saveState(state);
  return state;
}

function updateInventory(state, id, values) {
  state.inventoryItems = state.inventoryItems.map(item =>
    item.id === id && item.petId === state.activePetId ? { ...item, ...values } : item
  );
  saveState(state);
  return state;
}

function adjustInventory(state, id, amount) {
  state.inventoryItems = state.inventoryItems.map(item =>
    item.id === id && item.petId === state.activePetId ? { ...item, current: Math.max(0, item.current + amount) } : item
  );
  saveState(state);
  return state;
}

function addInventoryItem(state, label, icon, color, amount) {
  if (!state.activePetId) return state;
  const newItem = {
    id: generateId(), petId: state.activePetId, typeId: null,
    label, icon, color,
    current: 0, consumptionAmount: parseInt(amount) || 0, consumptionInterval: 1, consumptionTimeUnit: 'day', consumptionUnit: 'g', unit: 'g'
  };
  state.inventoryItems = [...state.inventoryItems, newItem];
  saveState(state);
  return state;
}

function deleteInventoryItem(state, id) {
  state.inventoryItems = state.inventoryItems.filter(i => i.id !== id);
  saveState(state);
  return state;
}

function addCustomAction(state, label, color, iconIdx) {
  if (!state.activePetId) return state;
  const newAction = { id: generateId(), petId: state.activePetId, label, color, iconIdx };
  state.customActions = [...state.customActions, newAction];
  saveState(state);
  return state;
}

function _removeActionHistory(state, petId, type) {
  if (type === 'log_weight') {
    state.weightHistory = state.weightHistory.filter(entry => entry.petId !== petId);
    return;
  }

  state.logs = state.logs.filter(log => !(log.petId === petId && log.type === type));
}

function deleteCustomAction(state, id) {
  const action = state.customActions.find(ca => ca.id === id);
  const petId = action && action.petId;
  state.customActions = state.customActions.filter(ca => ca.id !== id);
  _removeActionHistory(state, petId, `custom_${id}`);
  saveState(state);
  return state;
}

function deleteActionHistory(state, petId, type) {
  _removeActionHistory(state, petId, type);
  saveState(state);
  return state;
}

function addLog(state, type, targetDate, note, color, iconIdx) {
  if (!state.activePetId) return state;
  targetDate = targetDate || new Date().toISOString();
  const newLog = { id: generateId(), petId: state.activePetId, type, date: targetDate, note: note || '', color, iconIdx };

  // 标记相关提醒为完成
  state.reminders = state.reminders.map(r =>
    (r.petId === state.activePetId && r.type === type && !r.done) ? { ...r, done: true } : r
  );

  state.logs = [newLog, ...state.logs];

  // 自动创建下次提醒
  const daysToAdd = { deworming: 30, vaccine: 365, brush_teeth: 1, scoop_litter: 1 };
  if (daysToAdd[type]) {
    const dueDate = new Date(targetDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd[type]);
    const reminder = { id: generateId(), petId: state.activePetId, type, dueDate: dueDate.toISOString(), done: false };
    state.reminders = [reminder, ...state.reminders];
  }

  saveState(state);
  return state;
}

function deleteLog(state, id) {
  state.logs = state.logs.filter(l => l.id !== id);
  saveState(state);
  return state;
}

function addWeight(state, weight, targetDate) {
  if (!state.activePetId) return state;
  targetDate = targetDate || new Date().toISOString();
  const entry = { id: generateId(), petId: state.activePetId, date: targetDate, weight: parseFloat(weight) };
  state.weightHistory = [...state.weightHistory, entry].sort((a, b) => new Date(a.date) - new Date(b.date));
  saveState(state);
  return state;
}

function deleteWeight(state, id) {
  state.weightHistory = state.weightHistory.filter(w => w.id !== id);
  saveState(state);
  return state;
}

function addMedicalRecord(state, tags, imageStr, targetDate) {
  if (!state.activePetId) return state;
  targetDate = targetDate || new Date().toISOString();
  const newRecord = { id: generateId(), petId: state.activePetId, date: targetDate, tags, image: imageStr };
  state.medicalRecords = [newRecord, ...state.medicalRecords];
  saveState(state);
  return state;
}

function deleteMedicalRecord(state, id) {
  state.medicalRecords = state.medicalRecords.filter(m => m.id !== id);
  saveState(state);
  return state;
}

function clearAllData() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  try {
    wx.removeStorageSync(STORAGE_KEY);
    wx.removeStorageSync('petpaw_language');
  } catch (e) {
    console.error('Failed to clear data:', e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

module.exports = {
  loadState,
  saveState,
  flushState,
  performDailyDeduction,
  setActivePetId,
  addPet,
  editPet,
  deletePet,
  updateInventory,
  adjustInventory,
  addInventoryItem,
  deleteInventoryItem,
  addCustomAction,
  deleteCustomAction,
  deleteActionHistory,
  addLog,
  deleteLog,
  addWeight,
  deleteWeight,
  addMedicalRecord,
  deleteMedicalRecord,
  clearAllData
};
