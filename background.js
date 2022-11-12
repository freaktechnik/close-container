"use strict";

const MENU_ITEM = 'close',
    MENU_ITEM_MULTI = 'close-many',
    SESSION_CURRENT_ID = 'currentId';

function init() {
    browser.menus.create({
        contexts: [ 'tab' ],
        id: MENU_ITEM,
        enabled: false,
        title: browser.i18n.getMessage("context"),
        type: 'normal'
    });

    browser.menus.create({
        contexts: [ 'tab' ],
        id: MENU_ITEM_MULTI,
        enabled: false,
        title: browser.i18n.getMessage("contextMulti"),
        type: 'normal',
        visible: false
    });

    sessionStorage.setItem(SESSION_CURRENT_ID, 0);
}

browser.runtime.onStartup.addListener(() => {
    init();
});

browser.runtime.onInstalled.addListener((details) => {
    if(details.reason !== "browser_update") {
        init();
    }
});

browser.menus.onShown.addListener(async (info, tab) => {
    if(!info.menuIds.includes(MENU_ITEM) && !info.menuIds.includes(MENU_ITEM_MULTI)) {
        return;
    }
    const menuId = sessionStorage.getItem(SESSION_CURRENT_ID) ?? 0;
    let suffix = '';
    if(tab.pinned) {
        suffix = ` ${browser.i18n.getMessage("includingPinned")}`;
    }
    if(info.menuIds.includes(MENU_ITEM)) {
        try {
            const container = await browser.contextualIdentities.get(tab.cookieStoreId);
            const currentId = sessionStorage.getItem(SESSION_CURRENT_ID) ?? 0;
            if(currentId != menuId) {
                return;
            }
            browser.menus.update(MENU_ITEM, {
                title: browser.i18n.getMessage("namedContext", container.name) + suffix,
                enabled: true
            });
        }
        catch(e) {
            // Probably no container
            browser.menus.update(MENU_ITEM, {
                title: browser.i18n.getMessage("context") + suffix,
                enabled: true
            });
        }
    }
    if(info.menuIds.includes(MENU_ITEM_MULTI)) {
        try {
            const tabs = await browser.tabs.query({
                highlighted: true,
                windowId: tab.windowId
            });
            const currentId = sessionStorage.getItem(SESSION_CURRENT_ID) ?? 0;
            if(currentId != menuId) {
                return;
            }
            if(tabs.some((t) => t.id === tab.id)) {
                const containerIds = new Set(tabs.map((t) => t.cookieStoreId));
                if(containerIds.length <= 1) {
                    throw new Error("Not more than one container selected");
                }
                let hasNoContainer = false;
                const filteredIds = Array.from(containerIds).filter((c) => {
                    if(c === "firefox-default") {
                        hasNoContainer = true;
                        return false;
                    }
                    return true;
                });
                const containers = await Promise.all(filteredIds.map((c) => browser.contextualIdentities.get(c)));
                const currentId = sessionStorage.getItem(SESSION_CURRENT_ID) ?? 0;
                if(currentId != menuId) {
                    return;
                }
                if(hasNoContainer) {
                    containers.push({
                        name: browser.i18n.getMessage("noContainer")
                    });
                }
                const names = containers.map((c) => c.name).join(', ');
                browser.menus.update(MENU_ITEM_MULTI, {
                    title: browser.i18n.getMessage("namedContextMulti", names) + suffix,
                    enabled: true,
                    visible: true
                });
            }
            else {
                throw new Error("No multiselection tab");
            }
        }
        catch(e) {
            browser.menus.update(MENU_ITEM_MULTI, {
                title: browser.i18n.getMessage("contextMulti"),
                enabled: false,
                visible: false
            });
        }
    }
    browser.menus.refresh();
});

browser.menus.onHidden.addListener(() => {
    const nextId = Number.parseInt(sessionStorage.getItem(SESSION_CURRENT_ID) ?? 0) + 1;
    sessionStorage.setItem(SESSION_CURRENT_ID, nextId);
});

browser.menus.onClicked.addListener(async (info, tab) => {
    let cookieStores = new Set();
    if(info.menuItemId === MENU_ITEM) {
        const { cookieStoreId } = tab;
        cookieStores.add(cookieStoreId);
    }
    else if(info.menuItemId === MENU_ITEM_MULTI) {
        const tabs = await browser.tabs.query({
            highlighted: true,
            windowId: tab.windowId
        });
        if(tabs.some((t) => t.id === tab.id)) {
            cookieStores = new Set(tabs.map((t) => t.cookieStoreId));
        }
        else {
            cookieStores.add(tab.cookieStoreId);
        }
    }
    if(cookieStores.size) {
        await Promise.all(Array.from(cookieStores, (cookieStoreId) => {
            const query = {
                cookieStoreId
            };
            if(!tab.pinned) {
                query.pinned = false;
            }
            return browser.tabs.query(query)
                .then((tabsToClose) => browser.tabs.remove(tabsToClose.map((t) => t.id)))
        }));
    }
});

browser.tabs.onHighlighted.addListener(async (tabs) => {
    let visible = false;
    if(tabs.tabIds.length > 1) {
        const highlightedTabs = await browser.tabs.query({
            windowId: tabs.windowId,
            highlighted: true
        });
        const cookieStores = new Set(highlightedTabs.map((t) => t.cookieStoreId));
        visible = cookieStores.size > 1;
    }
    browser.menus.update(MENU_ITEM_MULTI, {
        visible
    });
});
