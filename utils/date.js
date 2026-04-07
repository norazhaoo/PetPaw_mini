// utils/date.js - 日期工具函数 (替代 date-fns)

/**
 * 格式化日期
 * @param {Date|string} date
 * @param {string} fmt - 支持: 'YYYY-MM-DD', 'MM-DD', 'HH:mm', 'MMMM yyyy', 'MMM dd', 'MMM do, yyyy h:mm a', 'd'
 * @param {object} options - 可选列表: { months: [], weekdays: [] }
 */
function formatDate(date, fmt, options = {}) {
  if (typeof date === 'string') date = new Date(date);
  if (!(date instanceof Date) || isNaN(date)) return '';

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const MONTHS_FULL = options.months || ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = options.monthsShort || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const pad = (n) => n.toString().padStart(2, '0');

  const ordinal = (n) => {
    if (options.noOrdinal) return n;
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  switch (fmt) {
    case 'YYYY-MM-DD':
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    case 'MM-DD':
      return `${pad(month + 1)}-${pad(day)}`;
    case 'HH:mm':
      return `${pad(hours)}:${pad(minutes)}`;
    case 'MMMM yyyy':
      return options.isZH ? `${year}年 ${MONTHS_FULL[month]}` : `${MONTHS_FULL[month]} ${year}`;
    case 'MMM dd':
      return options.isZH ? `${MONTHS_SHORT[month]}${pad(day)}日` : `${MONTHS_SHORT[month]} ${pad(day)}`;
    case 'MMM do':
      return options.isZH ? `${MONTHS_SHORT[month]}${day}日` : `${MONTHS_SHORT[month]} ${ordinal(day)}`;
    case 'MMM dd, yyyy h:mm a': {
      const h = hours % 12 || 12;
      const ampm = hours < 12 ? 'AM' : 'PM';
      if (options.isZH) {
        const ap = hours < 12 ? '上午' : '下午';
        return `${year}年 ${MONTHS_SHORT[month]}${pad(day)}日 ${ap}${h}:${pad(minutes)}`;
      }
      return `${MONTHS_SHORT[month]} ${pad(day)}, ${year} ${h}:${pad(minutes)} ${ampm}`;
    }
    case 'd':
      return day.toString();
    default:
      return `${year}-${pad(month + 1)}-${pad(day)}`;
  }
}

/**
 * 解析 ISO 日期字符串
 */
function parseISO(str) {
  return new Date(str);
}

/**
 * 获取月份第一天
 */
function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取月份最后一天
 */
function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 获取月份每一天
 */
function eachDayOfInterval(start, end) {
  const days = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (current <= last) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * 判断两个日期是否同一天
 */
function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * 判断两个日期是否同一月
 */
function isSameMonth(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * 判断是否今天
 */
function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * 获取星期几 (0=Sunday)
 */
function getDay(date) {
  return new Date(date).getDay();
}

/**
 * 获取一天的开始
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 加减月份
 */
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function subMonths(date, n) {
  return addMonths(date, -n);
}

/**
 * 两个日期之间相差的天数
 */
function differenceInDays(d1, d2) {
  const a = startOfDay(d1);
  const b = startOfDay(d2);
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * 距现在的文字描述 (替代 formatDistanceToNow)
 */
function formatDistanceToNow(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'less than a minute';
  if (diffMin < 60) return diffMin === 1 ? '1 minute' : `${diffMin} minutes`;
  if (diffHour < 24) return diffHour === 1 ? '1 hour' : `${diffHour} hours`;
  return diffDay === 1 ? '1 day' : `${diffDay} days`;
}

/**
 * 判断 d1 是否在 d2 之前
 */
function isBefore(d1, d2) {
  return new Date(d1) < new Date(d2);
}

module.exports = {
  formatDate,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
  startOfDay,
  addMonths,
  subMonths,
  differenceInDays,
  formatDistanceToNow,
  isBefore
};
