const closeTabs = async (cookieStoreId) => {
    const tabs = await browser.tabs.query({
        cookieStoreId
    });
    if(tabs.length) {
        await browser.tabs.remove(tabs.map((t) => t.id));
    }
    window.close();
};

Promise.all([
    new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true, passive: true })),
    browser.contextualIdentities.query({})
]).then(async ([_, containers]) => {
    const list = document.getElementById("containers");
    const noContainer = document.getElementById("default");
    let replacedNoContainerIcon = false;

    noContainer.querySelector(".label").textContent = browser.i18n.getMessage("noContainer");
    noContainer.addEventListener("click", () => closeTabs('firefox-default'));

    for(const container of containers) {
        const button = document.createElement("button");

        const icon = document.createElement("span");
        icon.classList.add("icon");
        icon.style.mask = `url(${container.iconUrl}) center / contain no-repeat`;
        icon.style.background = container.color;
        button.append(icon);

        if(!replacedNoContainerIcon && container.icon === "circle") {
            const noIcon = noContainer.querySelector(".icon");
            noIcon.textContent = '';
            noIcon.style.mask = `url(${container.iconUrl}) center / contain no-repeat`;
            noIcon.style.background = window.getComputedStyle(noIcon).getPropertyValue('color');
            replacedNoContainerIcon = true;
        }

        const label = document.createElement("span");
        label.classList.add("label");
        label.textContent = container.name;
        button.append(label);

        button.addEventListener("click", () => closeTabs(container.cookieStoreId));
        const item = document.createElement("li");
        item.append(button);
        noContainer.parentElement.insertAdjacentElement('beforebegin', item);
    }
});
