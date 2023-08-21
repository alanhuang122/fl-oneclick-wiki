// Here we inject our code into the context of the page itself, since we need to patch its XHR mechanisms.
var s = document.createElement('script');
s.src = chrome.runtime.getURL('inject.js');
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

window.addEventListener("message", function (event) {
    if (event.source !== window)
        return;

    if (event.data.action && event.data.action === "openInFLWiki") {
        let sanitized = event.data.title
            .replaceAll(" ", "_")
        let encoded = encodeURIComponent(sanitized)

        chrome.runtime.sendMessage({
            originalTitle: event.data.title,
            encodedTitle: encoded,
            entityId: event.data.entityId,
            filterCategories: event.data.filterCategories
        });
    }
});