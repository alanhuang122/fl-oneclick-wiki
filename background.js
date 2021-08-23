chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let destination = "https://fallenlondon.wiki/wiki/" + request.destination;

    chrome.tabs.create({url: destination, active: true});

    sendResponse({url: destination});
})