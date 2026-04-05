// Listen for tab updates (when a user navigates to a new page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only fire off request if the URL is completely loaded/changed
    if (changeInfo.url) {
        checkUrlWithBackend(tabId, changeInfo.url);
    }
});

function checkUrlWithBackend(tabId, url) {
    // Only check http and https URLs
    if (!url.startsWith('http')) return;

    fetch('http://127.0.0.1:8000/check-url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
    .then(response => response.json())
    .then(data => {
        if (data.is_scam) {
            // Change badge text to warn user with an exclamation point
            chrome.action.setBadgeText({ text: '!', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
            console.warn(`[Scam Detector] Scam detected on tab ${tabId}: `, data.reason);
        } else {
            // Site is marked as safe
            chrome.action.setBadgeText({ text: 'safe', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#27ae60', tabId: tabId });
        }
    })
    .catch(error => {
        console.error('[Scam Detector] Error connecting to Backend API. Is it running?', error);
    });
}