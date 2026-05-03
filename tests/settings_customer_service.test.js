const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

function sectionBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start);
  assert(start >= 0 && end > start, `Expected section between ${startToken} and ${endToken}`);
  return source.slice(start, end);
}

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

const settingsWxml = read('pages/settings/settings.wxml');
const settingsJs = read('pages/settings/settings.js');
const settingsWxss = read('pages/settings/settings.wxss');
const zh = require('../utils/i18n/zh');
const en = require('../utils/i18n/en');
const helpSubmenuWxml = sectionBetween(settingsWxml, '<!-- Help Submenu -->', '<!-- About -->');
const helpSubmenuCss = cssRule(settingsWxss, '.help-submenu');
const helpSubmenuItemCss = cssRule(settingsWxss, '.help-submenu-item');

assert(
  helpSubmenuWxml.includes('open-type="contact"') &&
    helpSubmenuWxml.includes('class="help-submenu-item contact-service-button"') &&
    helpSubmenuWxml.includes('wx:if="{{showHelpMenu}}" class="help-submenu"') &&
    helpSubmenuWxml.includes('session-from="settings_help"') &&
    helpSubmenuWxml.includes('{{i18nData.contact_service}}'),
  'settings help submenu should expose a native WeChat customer service contact button'
);

assert(
  !helpSubmenuWxml.includes('<image') &&
    !helpSubmenuWxml.includes('menu-icon') &&
    !helpSubmenuWxml.includes('menu-arrow') &&
    !helpSubmenuWxml.includes('ic.src('),
  'settings help submenu contact button should not render an icon or trailing arrow'
);

assert(
  settingsWxml.includes('bindtap="toggleHelpMenu"') &&
    settingsJs.includes('showHelpMenu: false') &&
    settingsJs.includes('toggleHelpMenu()'),
  'settings help row should toggle the help submenu'
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
    settingsWxss.includes('.help-submenu') &&
    settingsWxss.includes('.help-submenu-item') &&
    settingsWxss.includes('.help-submenu-label') &&
    helpSubmenuCss.includes('background: #FAF9F5') &&
    helpSubmenuCss.includes('padding: 40rpx') &&
    helpSubmenuCss.includes('display: grid') &&
    helpSubmenuCss.includes('grid-template-columns: 1fr') &&
    helpSubmenuCss.includes('gap: 16rpx') &&
    helpSubmenuCss.includes('border-bottom: 2rpx solid #F0EDE6') &&
    helpSubmenuItemCss.includes('background: var(--card-bg)') &&
    helpSubmenuItemCss.includes('border: 4rpx solid #E0DACA') &&
    helpSubmenuItemCss.includes('padding: 24rpx') &&
    helpSubmenuItemCss.includes('border-radius: 24rpx') &&
    helpSubmenuItemCss.includes('justify-content: center') &&
    settingsWxss.includes('line-height: normal'),
  'native contact button should match the language settings submenu style'
);
