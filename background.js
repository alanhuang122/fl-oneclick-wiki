function openNewTab(url) {
    chrome.tabs.create({url: url, active: true});
}

function generateConditions(request){
    let conditions = [];

    conditions.push(`ID::${request.storyletId}`);

    if (request.filterCategories) {
        const categoryExpr = request.filterCategories.join("||");
        conditions.push(`Has Game Type::${categoryExpr}`);
    }

    // each part of the conditions must start with \u001f
    return `\u001f` + conditions.join(`\u001f`);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const destination = "https://fallenlondon.wiki/wiki/Special:Search/" + request.encodedTitle;

    if (request.storyletId != null) {
        const conditions = generateConditions(request);
        
        let formData = new FormData();
        formData.append("action", "askargs");
        formData.append("format", "json");
        formData.append("conditions", conditions);
        formData.append("printouts", "ID");

        fetch("https://fallenlondon.wiki/w/api.php", {method: "POST", body: formData})
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
                    for (let [key, entry] of entries) {
                        console.debug(`Opening tab for ${entry.fullurl}`);
                        openNewTab(entry.fullurl);
                    }
                } else {
                    console.debug(`No pages found for ID ${request.storyletId}, falling back to using title.`);
                    openNewTab(destination);
                }
            })
            .catch(error => {
                console.error(error);
                console.debug("Error has occured, falling back to using title.")
                openNewTab(destination);
            });
    } else {
        console.debug("No ID found for the storylet, falling back to using title.");
        openNewTab(destination);
    }

    sendResponse({});
})
