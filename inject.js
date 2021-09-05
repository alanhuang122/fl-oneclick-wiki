(function () {
    const GLOBE_BTN_CLASS_LIST = "fa fa-inverse fa-stack-1x fa-globe";
    const DONE = 4;

    let authToken = null;
    let currentStoryletId = null;

    async function getStoryletID() {
        if (currentStoryletId != null) {
            console.debug("Using saved storylet ID...")
            return currentStoryletId;
        }

        console.debug("Current storylet ID is unknown, trying to fetch one from server.");
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
        outerSpan.setAttribute("title", "Look it up on Fallen London Wiki");

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
                        if (mediaRoots.length !== 0) {
                            mediaRoot = mediaRoots[0];
                        }
                    } else {
                        mediaRoot = node;
                    }

                    if (mediaRoot && !mediaRoot.classList.contains("modal-dialog")) {
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
                        }
                    }

                    let branches = null;
                    if (node.hasAttribute("data-branch-id")) {
                        branches = [node];
                    } else {
                        branches = node.querySelectorAll("div[data-branch-id]");
                    }

                    for (const branchContainer of branches) {
                        const branchId = branchContainer.attributes["data-branch-id"].value;
                        const branchHeader = branchContainer.querySelector("h2[class*='branch__title'], h2[class*='storylet__heading']");
                        if (!branchHeader) {
                            continue;
                        }

                        let existingButtons = branchContainer.getElementsByClassName(GLOBE_BTN_CLASS_LIST);
                        if (existingButtons.length > 0) {
                            console.debug("Duplicate Wiki buttons found, please tell the developer about it!");
                            return;
                        }

                        const wikiButton = createWikiButton();
                        wikiButton.addEventListener("click", () => {
                            window.postMessage({
                                action: "openInFLWiki",
                                title: branchHeader.textContent,
                                storyletId: branchId,
                            })
                        });

                        const otherButtons = branchContainer.querySelectorAll("div[class*='buttonlet']");
                        const container = branchHeader.parentElement;
                        if (otherButtons.length > 0) {
                            container.insertBefore(wikiButton, otherButtons[otherButtons.length - 1].nextSibling);
                        } else {
                            container.insertBefore(wikiButton, container.firstChild);
                        }
                    }
                }
            }
        }
    }));

    function authTokenSniffer(original_function) {
        return function (name, value) {
            if (name === "Authorization" && value !== authToken) {
                authToken = value;
            }
            return original_function.apply(this, arguments);
        }
    }

    function parseResponse(response) {
        if (this.readyState === DONE) {
            if (response.currentTarget.responseURL.includes("/api/storylet")) {
                let data = JSON.parse(response.target.responseText);

                // No point in trying to get storylet ID from a failed request
                if (!data.isSuccess) {
                    return;
                }

                if (data.phase === "Available" || data.phase === "End") {
                    // We are not in any storylet at the moment or it just ended
                    currentStoryletId = null;
                } else if (data.phase === "In") {
                    // Store retrieved ID to speed up Wiki page lookup in the future
                    currentStoryletId = data.storylet.id;
                }
            }
        }
    }

    function openBypass(original_function) {
        return function (method, url, async) {
            this.addEventListener("readystatechange", parseResponse);
            return original_function.apply(this, arguments);
        };
    }

    /*
     We need this for a rare edge case when for some reason we started in a place where no calls
     to /api/storylet endpoints took place. In that scenario we'll need to do a proactive storylet
     discovery via an API call and it requires authorization.

     */
    XMLHttpRequest.prototype.setRequestHeader = authTokenSniffer(XMLHttpRequest.prototype.setRequestHeader);
    /*
    Here we are doing passive storylet ID discovery, since call to /api/storylet ARE NOT IDEMPOTENT
    (kudos to Saklad5 for informing me about it and light a candle for Seamus).
     */
    XMLHttpRequest.prototype.open = openBypass(XMLHttpRequest.prototype.open);

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
