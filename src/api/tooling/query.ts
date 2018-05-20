"use babel";

import ToolingRequest from "./tooling-request.js";

export default class Query extends ToolingRequest<Array<any>> {
    constructor(query: string, referenceId?: string) {
        super({ method: "GET", path: "/query/?q=" + encodeQuery(query) }, referenceId);
    }

    getResult(rawResponse: QueryResult): Array<any> {
        return rawResponse.records;
    }
}

function encodeQuery(query : string) {
    encodeURIComponent(query.replace(/\s+/g, " ").trim());
}

export interface QueryResult {
    records: Array<any>;
}
