// components/icon/icon.js
// 图标名称到 PNG 文件路径的映射表
const ICON_MAP = {
  // === 快速操作图标 ===
  'vaccine':       '/static/icons/syringe.png',
  'deworming':     '/static/icons/bug.png',
  'brush_teeth':   '/static/icons/tooth.png',
  'scoop_litter':  '/static/icons/shovel.png',
  'walk_dog':      '/static/icons/bone.png',
  'scale':         '/static/icons/scale.png',

  // === 库存图标 ===
  'Package':       '/static/icons/package.png',
  'food_refill':   '/static/icons/stock-package.png',
  'Archive':       '/static/icons/archive.png',
  'litter_refill': '/static/icons/stock-archive.png',

  // === 自定义操作可选图标 (16个) ===
  'Star':      '/static/icons/icon-star.png',
  'Heart':     '/static/icons/icon-heart.png',
  'Droplet':   '/static/icons/icon-droplet.png',
  'Sun':       '/static/icons/icon-sun.png',
  'Zap':       '/static/icons/icon-zap.png',
  'Smile':     '/static/icons/icon-smile.png',
  'Music':     '/static/icons/icon-music.png',
  'Coffee':    '/static/icons/icon-coffee.png',
  'Camera':    '/static/icons/camera.png',
  'Gift':      '/static/icons/icon-gift.png',
  'Umbrella':  '/static/icons/icon-umbrella.png',
  'Book':      '/static/icons/icon-book.png',
  'Feather':   '/static/icons/icon-feather.png',
  'Flame':     '/static/icons/icon-flame.png',
  'Moon':      '/static/icons/icon-moon.png',
  'Cloud':     '/static/icons/icon-cloud.png',

  // === 症状图标 ===
  'Thermometer': '/static/icons/symptom-fever.png',
  'Frown':       '/static/icons/symptom-vomiting.png',
  'Wind':        '/static/icons/symptom-coughing.png',

  // === 通用 UI 图标 ===
  'Plus':         '/static/icons/plus.png',
  'XCircle':      '/static/icons/x-circle.png',
  'ChevronLeft':  '/static/icons/chevron-left.png',
  'ChevronRight': '/static/icons/chevron-right.png',
  'Check':        '/static/icons/check.png',
  'Pencil':       '/static/icons/pencil.png',
  'Trash2':       '/static/icons/trash.png',
  'FileText':     '/static/icons/file-text.png',
  'Stethoscope':  '/static/icons/stethoscope.png',
  'medical':      '/static/icons/stethoscope.png',

  // === 设置页图标 ===
  'Globe':        '/static/icons/globe.png',
  'HelpCircle':   '/static/icons/help-circle.png',
  'Info':         '/static/icons/info.png',
  'Settings':     '/static/icons/settings-gear.png',

  // === 其他 ===
  'Pill':      '/static/icons/pill.png',
  'Fish':      '/static/icons/fish.png',
  'Cylinder':  '/static/icons/cylinder.png',
};

// 默认回退图标
const FALLBACK_ICON = '/static/icons/pawprint.png';

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: Number, value: 48 },
    color: { type: String, value: '#4A403A' }
  },

  observers: {
    'name': function(name) {
      this.setData({
        iconSrc: ICON_MAP[name] || FALLBACK_ICON
      });
    }
  },

  data: {
    iconSrc: FALLBACK_ICON
  },

  lifetimes: {
    attached() {
      this.setData({
        iconSrc: ICON_MAP[this.properties.name] || FALLBACK_ICON
      });
    }
  }
});
