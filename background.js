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

                const entries = Object.entries(result.query.results);
                if (entries.length > 0) {
                    if (entries.length > 5){
                        console.warn(`[FL 1-Click Wiki] Wiki server returned ${entries.length} results for the query '${conditions}'.\n`
                                    + `Please notify the wiki admins about this.`);
                    }
                    for (let [key, entry] of entries) {
                        console.debug(`[FL 1-Click Wiki] Opening tab for ${entry.fullurl}`);
                        openNewTab(entry.fullurl, targetPosition);
                    }
                } else {
                    console.debug(`[FL 1-Click Wiki] No pages found for ID ${request.entityId}, falling back to using title.`);
                    openNewTab(destination, targetPosition);
                }
            })
            .catch(error => {
                console.error(error);
                console.debug("[FL 1-Click Wiki] Error has occured, falling back to using title.")
                openNewTab(destination, targetPosition);
            });
    } else {
        console.debug("[FL 1-Click Wiki] No ID found for the storylet, falling back to using title.");
        openNewTab(destination, targetPosition);
    }

    sendResponse({});
})
