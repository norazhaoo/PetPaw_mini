// utils/storage.js - 数据存储管理 (替代 React Context + localStorage)

const { generateId } = require('./util');
const { differenceInDays } = require('./date');

const STORAGE_KEY = 'petpaw_data';

const defaultState = {
  activePetId: null,
  pets: [],
  inventoryItems: [
    { id: 'food', label: 'Food', current: 0, dailyConsumption: 50, icon: 'Package', color: '#F5B041', unit: 'g' },
    { id: 'litter', label: 'Litter', current: 0, dailyConsumption: 200, icon: 'Archive', color: '#AAB7B8', unit: 'g' }
  ],
  lastDeductionDate: new Date().toISOString(),
  logs: [],
  reminders: [],
  weightHistory: [],
  medicalRecords: [],
  customActions: []
};

/**
 * 加载数据（含迁移逻辑）
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
          { id: 'litter', label: 'Litter', current: parsed.inventory.litter?.current || 0, dailyConsumption: parsed.inventory.litter?.dailyConsumption || 200, icon: 'Archive', color: '#AAB7B8', unit: 'g' }
        ];
        delete parsed.inventory;
      } else if (!parsed.inventoryItems) {
        parsed.inventoryItems = JSON.parse(JSON.stringify(defaultState.inventoryItems));
      }

      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

/**
 * 保存数据
 */
function saveState(state) {
  try {
    wx.setStorageSync(STORAGE_KEY, state);
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

/**
 * 执行库存自动扣减
 */
function performDailyDeduction(state) {
  const today = new Date();
  const lastDeduction = new Date(state.lastDeductionDate || today.toISOString());
  const daysPassed = differenceInDays(today, lastDeduction);

  if (daysPassed > 0) {
    state.inventoryItems = state.inventoryItems.map(item => ({
      ...item,
      current: Math.max(0, item.current - ((item.dailyConsumption || 0) * daysPassed))
    }));
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

  let nextInventory = [...state.inventoryItems];
  if (petData.species === 'dog') {
    nextInventory = nextInventory.filter(i => i.id !== 'litter');
  } else if (petData.species === 'cat') {
    if (!nextInventory.some(i => i.id === 'litter')) {
      nextInventory.unshift({ id: 'litter', label: 'Litter', current: 0, dailyConsumption: 200, icon: 'Archive', color: '#AAB7B8', unit: 'g' });
    }
  }

  state.pets = [...state.pets, newPet];
  state.activePetId = id;
  state.inventoryItems = nextInventory;

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
  if (state.activePetId === id) {
    state.activePetId = state.pets.length > 0 ? state.pets[0].id : null;
  }
  saveState(state);
  return state;
}

function updateInventory(state, id, values) {
  state.inventoryItems = state.inventoryItems.map(item =>
    item.id === id ? { ...item, ...values } : item
  );
  saveState(state);
  return state;
}

function adjustInventory(state, id, amount) {
  state.inventoryItems = state.inventoryItems.map(item =>
    item.id === id ? { ...item, current: Math.max(0, item.current + amount) } : item
  );
  saveState(state);
  return state;
}

function addInventoryItem(state, label, icon, color, dailyConsumption) {
  const newItem = {
    id: generateId(), label, icon, color,
    current: 0, dailyConsumption: parseInt(dailyConsumption) || 0, unit: 'g'
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

function deleteCustomAction(state, id) {
  state.customActions = state.customActions.filter(ca => ca.id !== id);
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
  addLog,
  deleteLog,
  addWeight,
  deleteWeight,
  addMedicalRecord,
  deleteMedicalRecord,
  clearAllData
};
