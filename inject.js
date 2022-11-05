(function () {
    const GLOBE_BTN_CLASS_LIST = "fa fa-inverse fa-stack-1x fa-search";
    const DONE = 4;

    const tooltipToQuality = new Map();

    let currentStoryletId = null;

    function wrapButtonInContainer(button) {
        const containerDiv = document.createElement("div");
        containerDiv.className = "branch__plan-buttonlet";
        containerDiv.appendChild(button);
        return containerDiv;
    }

    function createWikiButton() {
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
        return buttonlet;
    }

    function createLinkToWiki(text) {
        const link = document.createElement("a");
        link.setAttribute("href", "#");
        link.addEventListener("click", (e) => {
            window.postMessage({
                action: "openInFLWiki",
                title: e.target.textContent,
                entityId: null,
                filterCategories: ["Places"],
            });
        });
        link.textContent = text;

        return link;
    }

    function wikiButtonClickListener(container) {
        return function () {
            const headings = container.parentElement.getElementsByTagName("h1");
            if (headings.length === 0) {
                return;
            }
            const title = headings[0].textContent;

            if (currentStoryletId !== undefined) {
                if (currentStoryletId != null) {
                    console.debug(`[FL 1-Click Wiki] Current storylet ID: ${currentStoryletId}`)
                } else{
                    console.debug(`[FL 1-Click Wiki] Current storylet ID is not known, falling back to title...`)
                }

                window.postMessage({
                    action: "openInFLWiki",
                    title: title,
                    entityId: currentStoryletId,
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

                if (node.nodeName.toLowerCase() !== "div") {
                    continue;
                }

                let mediaRoot = null;

                const locationHeader = node.querySelector("p[class*='welcome__current-area']");
                if (locationHeader) {
                    // Get rid of the trailing comma
                    const cleanLocation = locationHeader.textContent.slice(0, locationHeader.textContent.length-1);
                    const locationLink = createLinkToWiki(cleanLocation);

                    locationHeader.textContent = "";
                    locationHeader.appendChild(locationLink);
                    locationHeader.appendChild(document.createTextNode(","));
                }

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
                        console.debug("[FL 1-Click Wiki] Duplicate Wiki buttons found, please tell the developer about it!");
                        return;
                    }

                    let mediaBody = mediaRoot.getElementsByClassName("media__body");
                    if (mediaBody.length > 0) {
                        const container = mediaBody[0];
                        const wikiButton = createWikiButton();
                        wikiButton.addEventListener("click", wikiButtonClickListener(container));

                        const otherButtons = container.getElementsByClassName("buttonlet-container");
                        if (otherButtons.length > 0) {
                            otherButtons[0].parentElement.insertBefore(wikiButton, otherButtons[0]);
                        } else {
                            let rootFrequencyHolder = container.querySelector("div[class='storylet-root__frequency']")
                            if (!rootFrequencyHolder) {
                                rootFrequencyHolder = document.createElement("div");
                                rootFrequencyHolder.classList.add("storylet-root__frequency");
                                container.insertBefore(rootFrequencyHolder, container.firstChild);
                            }

                            rootFrequencyHolder.appendChild(wikiButton);
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
                        console.debug("[FL 1-Click Wiki] Duplicate Wiki buttons found, please tell the developer about it!");
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

                    const wikiButton = wrapButtonInContainer(createWikiButton());
                    wikiButton.addEventListener("click", () => {
                        window.postMessage({
                            action: "openInFLWiki",
                            title: branchHeader.textContent,
                            entityId: branchId,
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

                    let qualityIcons = node.querySelectorAll("div[class*='quality-requirement'] div[role='button'] img");
                    for (const qualityIcon of qualityIcons) {
                        qualityIcon.classList.remove("cursor-default");
                        qualityIcon.classList.add("cursor-magnifier");

                        qualityIcon.onclick = function(ev) {
                            const icon = qualityIcon;
                            const associatedQuality = tooltipToQuality.get(icon.alt);
                            if (associatedQuality != null) {
                                window.postMessage({
                                    action: "openInFLWiki",
                                    title: associatedQuality.qualityName,
                                    entityId: associatedQuality.qualityId,
                                    filterCategories: ["Quality", "Item", "World Quality"],
                                })
                            }
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
                    // We are not in any storylet at the moment, or it just ended
                    currentStoryletId = null;
                } else if (data.phase === "In") {
                    // Store retrieved ID to speed up Wiki page lookup in the future
                    currentStoryletId = data.storylet.id;
                }

                tooltipToQuality.clear();

                if (data.storylets) {
                    for (const storylet of data.storylets) {
                        for (const qualityRequirement of storylet.qualityRequirements) {
                            const plainTextTooltip = qualityRequirement.tooltip.replace(/(<([^>]+)>)/gi, "");

                            tooltipToQuality.set(plainTextTooltip, qualityRequirement);
                        }
                    }
                } else if (data.storylet) {
                    for (const branch of data.storylet.childBranches) {
                        for (const qualityRequirement of branch.qualityRequirements) {
                            const plainTextTooltip = qualityRequirement.tooltip.replace(/(<([^>]+)>)/gi, "");

                            tooltipToQuality.set(plainTextTooltip, qualityRequirement);
                        }
                    }
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
    Here we are doing passive storylet ID discovery, since calls to /api/storylet ARE NOT IDEMPOTENT
    (kudos to Saklad5 for informing me about it and light a candle for Seamus).
     */
    XMLHttpRequest.prototype.open = openBypass(XMLHttpRequest.prototype.open);

    mainContentObserver.observe(document, {childList: true, subtree: true});
}())
