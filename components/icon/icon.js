// components/icon/icon.js
// 通用图标组件 — 封装 WXS 图标映射 + image 标签
// 用法: <icon name="vaccine" size="lg" />

const ICON_MAP = {
  // 快速操作
  'vaccine':       '/static/icons/syringe.png',
  'deworming':     '/static/icons/bug.png',
  'brush_teeth':   '/static/icons/tooth.png',
  'scoop_litter':  '/static/icons/shovel.png',
  'walk_dog':      '/static/icons/bone.png',
  'scale':         '/static/icons/scale.png',
  // 库存
  'Package':       '/static/icons/package.png',
  'food_refill':   '/static/icons/stock-package.png',
  'Archive':       '/static/icons/archive.png',
  'litter_refill': '/static/icons/stock-archive.png',
  // 自定义操作 (16个)
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
  // 症状
  'Thermometer': '/static/icons/symptom-fever.png',
  'Frown':       '/static/icons/symptom-vomiting.png',
  'Wind':        '/static/icons/symptom-coughing.png',
  // 通用 UI
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
  // 设置页
  'Globe':        '/static/icons/globe.png',
  'HelpCircle':   '/static/icons/help-circle.png',
  'Info':         '/static/icons/info.png',
  'Settings':     '/static/icons/settings-gear.png',
  // 其他
  'Pill':      '/static/icons/pill.png',
  'Fish':      '/static/icons/fish.png',
  'Cylinder':  '/static/icons/cylinder.png'
};

const FALLBACK = '/static/icons/pawprint.png';

const SIZE_MAP = {
  lg: 72,
  md: 48,
  sm: 28,
  xs: 20
};

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: String, value: 'md' }, // lg|md|sm|xs 或具体数值如 '36'
  },

  observers: {
    'name, size': function(name, size) {
      const src = ICON_MAP[name] || FALLBACK;
      const dim = SIZE_MAP[size] || parseInt(size) || SIZE_MAP.md;
      this.setData({ src, dim });
    }
  },

  data: {
    src: FALLBACK,
    dim: 48
  }
});
