"use babel";

import ToolingRequest from "./tooling-request.js";

export default class Query extends ToolingRequest {
    constructor(query, referenceId) {
        super({
            options: {
                method: "GET",
                path: "/query/?q=" + encodeURIComponent(query.replace(/\s+/g, " ").trim())
            }, referenceId
        });
    }

    getResult(rawResponse) {
        return rawResponse.records;
    }
}
