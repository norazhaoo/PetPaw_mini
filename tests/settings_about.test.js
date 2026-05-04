const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

const settingsJs = read('pages/settings/settings.js');
const zh = require('../utils/i18n/zh');
const en = require('../utils/i18n/en');

assert(
  settingsJs.includes("content: i18n.t('about_content')"),
  'settings about modal should load its content from i18n'
);

assert(
  !settingsJs.includes('Locally encrypted, species-adaptive smart tracking.'),
  'settings about modal should not keep the old hard-coded English content'
);

assert.strictEqual(
  zh.about_content,
  'PetPaw v2.5\n记录宠物生活的每一天。\n日常照护、物资余量、医疗记录和月度报告都在这里；数据保存在本机，安心好查。',
  'Chinese about content should be localized and user-friendly'
);

assert.strictEqual(
  en.about_content,
  'PetPaw v2.5\nA simple local journal for daily care, supplies, medical notes, and monthly pet reports. Your data stays on this device.',
  'English about content should stay available when the app language is English'
);
