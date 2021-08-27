(function () {
    const GLOBE_BTN_CLASS_LIST = "fa fa-inverse fa-stack-1x fa-globe"
    let authToken = null;

    async function getStoryletID() {
        const response = await fetch(
            "https://api.fallenlondon.com/api/storylet",
            {
                method: "POST",
                headers: {
                    "Authorization": authToken,
                },
            }
        )
        if (!response.ok) {
            throw new Error("FL API did not like our request")
        }

        const data = await response.json()
        if (!("storylet" in data)) {
            throw new Error("Current storylet is unknown.")
        }

        return data.storylet.id;
    }

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

    function wikiClickListener(container) {
        return function () {
            const headings = container.parentElement.getElementsByTagName("h1");
            const title = headings[0].textContent;
            if (headings.length === 0) {
                return;
            }

            getStoryletID()
                .then(storyletID => {
                    console.debug(`Current storylet ID: ${storyletID}`)
                    window.postMessage({
                        action: "openInFLWiki",
                        title: title,
                        storyletId: storyletID
                    })
                })
                .catch(error => {
                    console.error(error);
                    window.postMessage({
                        action: "openInFLWiki",
                        title: title,
                        storyletId: null
                    })
                })
        }
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

                    const actionResults = mediaRoot.parentElement.getElementsByClassName("media--quality-updates")
                    if (actionResults.length > 0) {
                        // This is a page with the action results, they do not have corresponding Wiki pages.
                        return;
                    }

                    let existingButtons = mediaRoot.getElementsByClassName(GLOBE_BTN_CLASS_LIST);
                    if (existingButtons.length > 0) {
                        console.debug("Duplicate Wiki buttons found, please tell the developer about it!");
                        return;
                    }

                    let mediaBody = mediaRoot.getElementsByClassName("media__body");
                    if (mediaBody.length > 0) {
                        const container = mediaBody[0];
                        const wikiButton = createWikiButton();
                        wikiButton.addEventListener("click", wikiClickListener(container));

                        const otherButtons = container.getElementsByClassName("storylet-root__frequency");
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

    function authTokenSniffer(original_function) {
        return function (name, value) {
            if (name === "Authorization" && value !== authToken) {
                authToken = value;
                console.debug("Got FL auth token!");
            }
            return original_function.apply(this, arguments);
        }
    }

    XMLHttpRequest.prototype.setRequestHeader = authTokenSniffer(XMLHttpRequest.prototype.setRequestHeader);

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
