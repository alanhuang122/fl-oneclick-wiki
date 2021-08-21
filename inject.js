(function () {
    const WIKI_BUTTON_CODE = `<div class="storylet-root__frequency">
    <button class="buttonlet-container" type="button">
        <span class="buttonlet fa-stack fa-lg buttonlet-enabled">
            <span class="fa fa-circle fa-stack-2x"></span>
            <span class="fa fa-inverse fa-stack-1x fa-globe"></span>
            <span class="u-visually-hidden">wiki</span>
        </span>
    </button>
</div>
    `;

    // Taken from https://stackoverflow.com/a/35385518
    function htmlToElement(html) {
        var template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }

    let mainContentObserver = new MutationObserver(((mutations, observer) => {
        for (let m = 0; m < mutations.length; m++) {
            let mutation = mutations[m];

            for (let n = 0; n < mutation.addedNodes.length; n++) {
                let node = mutation.addedNodes[n];

                if (node.nodeName.toLowerCase() === "div") {
                    var mediaRoot = null;
                    if (!node.classList.contains("media--root")) {
                        let mediaRoots = node.getElementsByClassName("media--root");
                        if (mediaRoots.length === 0) {
                            return;
                        }
                        mediaRoot = mediaRoots[0];
                    } else {
                        mediaRoot = node;
                    }

                    let mediaBody = mediaRoot.getElementsByClassName("media__body");
                    if (mediaBody.length > 0) {
                        let container = mediaBody[0];
                        let wikiButton = htmlToElement(WIKI_BUTTON_CODE);
                        wikiButton.addEventListener("click", function () {
                            let headings = container.parentElement.getElementsByTagName("h1");
                            if (headings.length > 0) {
                                window.postMessage({action: "openInFLWiki", title: headings[0].textContent})
                            }
                        });
                        let otherButtons = container.getElementsByClassName("storylet-root__frequency");
                        if (otherButtons.length > 0) {
                            container.insertBefore(wikiButton, otherButtons[otherButtons.length - 1].nextSibling);
                        } else {
                            container.insertBefore(wikiButton, container.firstChild);
                        }

                        return;
                    }
                }
            }
        }
    }))

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
