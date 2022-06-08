(function () {
    const GLOBE_BTN_CLASS_LIST = "fa fa-inverse fa-stack-1x fa-search";
    const DONE = 4;

    let currentStoryletId = null;

    function createWikiButton() {
        const containerDiv = document.createElement("div");
        containerDiv.className = "storylet-root__frequency";

        const buttonlet = document.createElement("button");
        buttonlet.setAttribute("type", "button");
        buttonlet.className = "buttonlet-container";

        const outerSpan = document.createElement("span");
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

            if (currentStoryletId !== undefined) {
                if (currentStoryletId != null) {
                    console.debug(`Current storylet ID: ${currentStoryletId}`)
                } else{
                    console.debug(`Current storylet ID is not known, falling back to title...`)
                }

                window.postMessage({
                    action: "openInFLWiki",
                    title: title,
                    storyletId: currentStoryletId,
                    filterCategories: ["Card", "Storylet"],
                });
            }
        }
    }

    let mainContentObserver = new MutationObserver(((mutations, observer) => {
        for (let m = 0; m < mutations.length; m++) {
            const mutation = mutations[m];

            for (let n = 0; n < mutation.addedNodes.length; n++) {
                const node = mutation.addedNodes[n];

                if (node.nodeName.toLowerCase() === "div") {
                    let mediaRoot = null;

                    if (!node.classList.contains("media--root")) {
                        const mediaRoots = node.getElementsByClassName("media--root");
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

                        // This is to prevent button's appearance on the custom branches introduced by the other
                        // extensions from "FL-series" (e.g. FL Masquerade).
                        if (branchId >= 777_777_777) {
                            continue;
                        }

                        const branchHeader = branchContainer.querySelector("h2[class*='branch__title'], h2[class*='storylet__heading']");
                        if (!branchHeader) {
                            continue;
                        }

                        let existingButtons = branchContainer.getElementsByClassName(GLOBE_BTN_CLASS_LIST);
                        if (existingButtons.length > 0) {
                            console.debug("Duplicate Wiki buttons found, please tell the developer about it!");
                            return;
                        }

                        let categories = null;
                        /*
                        There are ID collisions between different type of entities in the game,
                        so it makes sense to restrict search by ID to specific categories.

                        Example: card "Burning Shadows" and branch "Lay a false trail" on "Law's Long Arm"
                        have same ID - 10137.

                        Kudos to @Thorsb for noticing this and researching this solution!
                        */

                        if (branchContainer.classList.contains("storylet")) {
                            categories = ["Card", "Storylet"];
                        } else {
                            categories = ["Action", "Fate Action", "Item Action", "Social Action"] ;
                        }

                        const wikiButton = createWikiButton();
                        wikiButton.addEventListener("click", () => {
                            window.postMessage({
                                action: "openInFLWiki",
                                title: branchHeader.textContent,
                                storyletId: branchId,
                                filterCategories: categories,
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
    Here we are doing passive storylet ID discovery, since call to /api/storylet ARE NOT IDEMPOTENT
    (kudos to Saklad5 for informing me about it and light a candle for Seamus).
     */
    XMLHttpRequest.prototype.open = openBypass(XMLHttpRequest.prototype.open);

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
