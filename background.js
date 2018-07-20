"use strict";

const MENU_ITEM = 'close';

browser.menus.create({
    contexts: [ 'tab' ],
    id: MENU_ITEM,
    enabled: false,
    title: browser.i18n.getMessage("context"),
    type: 'normal'
});

let currentId = 0;

browser.menus.onShown.addListener(async (info, tab) => {
    if(!info.menuIds.includes(MENU_ITEM)) {
        return;
    }
    const menuId = currentId;
    try {
        const container = await browser.contextualIdentities.get(tab.cookieStoreId);
        if(currentId != menuId) {
            return;
        }
        browser.menus.update(MENU_ITEM, {
            title: browser.i18n.getMessage("namedContext", container.name),
            enabled: true
        });
    }
    catch(e) {
        // Probably no container
        browser.menus.update(MENU_ITEM, {
            title: browser.i18n.getMessage("context"),
            enabled: true
        });
    }
    browser.menus.refresh();
});

browser.menus.onHidden.addListener(() => {
    ++currentId;
});

browser.menus.onClicked.addListener(async (info, tab) => {
    if(info.menuItemId == MENU_ITEM) {
        const { cookieStoreId } = tab;
        const tabs = await browser.tabs.query({
            cookieStoreId
        });
        await browser.tabs.remove(tabs.map((t) => t.id));
    }
});
