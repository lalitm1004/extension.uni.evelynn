chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'pushToHandler' && request.url) {
        chrome.tabs.create({ url: request.url });
    }
})