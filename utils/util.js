// utils/util.js - 通用工具函数

/**
 * 生成唯一ID (替代 uuid v4)
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 深拷贝对象
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  generateId,
  deepClone
};
