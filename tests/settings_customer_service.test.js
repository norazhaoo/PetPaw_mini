const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

const settingsWxml = read('pages/settings/settings.wxml');
const settingsJs = read('pages/settings/settings.js');
const settingsWxss = read('pages/settings/settings.wxss');
const zh = require('../utils/i18n/zh');
const en = require('../utils/i18n/en');

assert(
  settingsWxml.includes('open-type="contact"') &&
    settingsWxml.includes('class="menu-item contact-service-button"') &&
    settingsWxml.includes('session-from="settings_help"') &&
    settingsWxml.includes('{{i18nData.contact_service}}'),
  'settings help area should expose a native WeChat customer service contact button'
);

assert(
  settingsJs.includes("contact_service: i18n.t('contact_service')"),
  'settings page should load customer service copy from i18n'
);

assert.strictEqual(
  zh.contact_service,
  '联系客服',
  'Chinese settings copy should label the customer service entry'
);

assert.strictEqual(
  en.contact_service,
  'Contact Support',
  'English settings copy should label the customer service entry'
);

assert(
  settingsWxss.includes('.contact-service-button') &&
    settingsWxss.includes('background: transparent') &&
    settingsWxss.includes('line-height: normal'),
  'native contact button should be reset to look like the existing settings menu item'
);
