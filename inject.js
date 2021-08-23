(function () {
    const GLOBE_BTN_CLASS_LIST = "fa fa-inverse fa-stack-1x fa-globe"

    function createWikiButton() {
        let containerDiv = document.createElement("div");
        containerDiv.className = "storylet-root__frequency";

        let buttonlet = document.createElement("button");
        buttonlet.setAttribute("type", "button");
        buttonlet.className = "buttonlet-container";

        let outerSpan = document.createElement("span");
        outerSpan.classList.add("buttonlet", "fa-stack", "fa-lg", "buttonlet-enabled");

        [
            ["fa", "fa-circle", "fa-stack-2x"],
            GLOBE_BTN_CLASS_LIST.split(" "),
            ["u-visually-hidden"]
        ].map(classNames => {
            let span = document.createElement("span");
            span.classList.add(...classNames);
            outerSpan.appendChild(span);
        })

        buttonlet.appendChild(outerSpan);
        containerDiv.appendChild(buttonlet);

        return containerDiv;
    }

    let mainContentObserver = new MutationObserver(((mutations, observer) => {
        for (let m = 0; m < mutations.length; m++) {
            let mutation = mutations[m];

            for (let n = 0; n < mutation.addedNodes.length; n++) {
                let node = mutation.addedNodes[n];

                if (node.nodeName.toLowerCase() === "div") {
                    let mediaRoot = null;
                    if (!node.classList.contains("media--root")) {
                        let mediaRoots = node.getElementsByClassName("media--root");
                        if (mediaRoots.length === 0) {
                            return;
                        }
                        mediaRoot = mediaRoots[0];
                    } else {
                        mediaRoot = node;
                    }

                    let existingButtons = mediaRoot.getElementsByClassName(GLOBE_BTN_CLASS_LIST);
                    if (existingButtons.length > 0) {
                        console.debug("Duplicate Wiki buttons found, please tell the developer about it!");
                        return;
                    }

                    let mediaBody = mediaRoot.getElementsByClassName("media__body");
                    if (mediaBody.length > 0) {
                        let container = mediaBody[0];
                        let wikiButton = createWikiButton();
                        wikiButton.addEventListener("click", function () {
                            let headings = container.parentElement.getElementsByTagName("h1");
                            if (headings.length > 0) {
                                window.postMessage({action: "openInFLWiki", title: headings[0].textContent});
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
    }));

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
