"use strict";

const MENU_ITEM = 'close',
    MENU_ITEM_MULTI = 'close-many';

browser.menus.create({
    contexts: [ 'tab' ],
    id: MENU_ITEM,
    enabled: false,
    title: browser.i18n.getMessage("context"),
    type: 'normal'
});

let canMulti = false;

if(browser.tabs.highlight) {
    try {
        browser.menus.create({
            contexts: [ 'tab' ],
            id: MENU_ITEM_MULTI,
            enabled: false,
            title: browser.i18n.getMessage("contextMulti"),
            type: 'normal',
            visible: false
        });
        canMulti = true;
    }
    catch(e) {
        console.warn('visible not supported yet');
    }
}

let currentId = 0;

browser.menus.onShown.addListener(async (info, tab) => {
    if(!info.menuIds.includes(MENU_ITEM) && !info.menuIds.includes(MENU_ITEM_MULTI)) {
        return;
    }
    const menuId = currentId;
    if(info.menuIds.includes(MENU_ITEM)) {
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
    }
    if(info.menuIds.includes(MENU_ITEM_MULTI)) {
        try {
            const tabs = await browser.tabs.query({
                highlighted: true,
                windowId: tab.windowId
            });
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
                    title: browser.i18n.getMessage("namedContextMulti", names),
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
    ++currentId;
});

browser.menus.onClicked.addListener(async (info, tab) => {
    //TODO don't close pinned tabs when action isn't on a pinned tab or something like that?
    let cookieStores = [];
    if(info.menuItemId === MENU_ITEM) {
        const { cookieStoreId } = tab;
        cookieStores.push(cookieStoreId);
    }
    else if(info.menuItemId === MENU_ITEM_MULTI) {
        const tabs = await browser.tabs.query({
            highlighted: true,
            windowId: tab.windowId
        });
        if(tabs.some((t) => t.id === tab.id)) {
            const containerIds = new Set(tabs.map((t) => t.cookieStoreId));
            cookieStores = Array.from(containerIds);
        }
        else {
            cookieStores.push(tab.cookieStoreId);
        }
    }
    if(cookieStores.length) {
        await Promise.all(cookieStores.map((cookieStoreId) => browser.tabs.query({
                cookieStoreId
            })
            .then((tabsToClose) => browser.tabs.remove(tabsToClose.map((t) => t.id)))
        ));
    }
});

if(canMulti) {
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
}
