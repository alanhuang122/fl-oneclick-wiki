function openNewTab(url, position) {
    chrome.tabs.create({url: url, active: true, index: position});
}

function generateConditions(request){
    let conditions = [];

    conditions.push(`:+`); // only request main namespace, i.e. no User:, Help:, etc pages
    conditions.push(`ID::${request.entityId}`);

    if (request.filterCategories) {
        const categoryExpr = request.filterCategories.join("||");
        conditions.push(`Has Game Type::${categoryExpr}`);
    }

    // each part of the conditions must start with \u001f
    return `\u001f` + conditions.join(`\u001f`);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const destination = "https://fallenlondon.wiki/wiki/Special:Search/" + request.encodedTitle;
    const targetPosition = sender.tab ? sender.tab.index : 0;

    if (request.entityId != null) {
        const conditions = generateConditions(request);
        
        let formData = new FormData();
        formData.append("action", "askargs");
        formData.append("format", "json");
        formData.append("conditions", conditions);
        formData.append("parameters", "limit=21");
        formData.append("printouts", "ID");

        fetch("https://fallenlondon.wiki/w/api.php", {method: "POST", mode: "cors", body: formData})
            .then(response => {
                if (!response.ok) {
                    throw new Error("Server did not like our query")
                }
                return response.json();
            })
            .then(result => {
                if ("error" in result) {
                    throw new Error(result.error.info);
                }

                const results = new Map(Object.entries(result.query.results));
                if (results.size === 1) {
                    // Exact match for our ID found, no need for additional heuristics.
                    openNewTab(results.values().next().value.fullurl, targetPosition);
                }
                else if (results.size > 1) {
                    /*
                    Some storylets may have multiple pages assigned to their ID (e.g. Arbor, Zee-Dreams).
                    In this case, we only want to open the page that matches the storylet's title _exactly_.
                    */

                    const exactTitleEntry = results.get(request.originalTitle);
                    if (exactTitleEntry != null) {
                        // Exact match found, just open that page and it should be enough.
                        console.debug(`[FL 1-Click Wiki] Found exact match for '${request.originalTitle}', opening tab for '${exactTitleEntry.fullurl}'`);
                        openNewTab(exactTitleEntry.fullurl, targetPosition);
                    } else {
                        // No exact match found, so go wild and open all pages for use to decide.
                        for (let [key, entry] of results) {
                            console.debug(`[FL 1-Click Wiki] Opening tab for ${entry.fullurl}`);
                            openNewTab(entry.fullurl, targetPosition);
                        }
                    }
                } else {
                    console.debug(`[FL 1-Click Wiki] No pages found for ID ${request.entityId}, falling back to using title.`);
                    openNewTab(destination, targetPosition);
                }
            })
            .catch(error => {
                console.error(error);
                console.debug("[FL 1-Click Wiki] Error has occurred, falling back to using title.")
                openNewTab(destination, targetPosition);
            });
    } else {
        console.debug("[FL 1-Click Wiki] No ID found for the storylet, falling back to using title.");
        openNewTab(destination, targetPosition);
    }

    sendResponse({});
})
