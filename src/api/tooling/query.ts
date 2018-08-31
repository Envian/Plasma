import ToolingRequest from "./tooling-request.js";

export default class Query extends ToolingRequest<Array<Record>> {
    constructor(query: string, referenceId?: string) {
        super({ method: "GET", path: "/query/?q=" + encodeQuery(query) }, referenceId);
    }

    handleResponse(rawResponse: QueryResult, statusCode: number): void {
        this.result = rawResponse.records;
        this.statusCode = statusCode;
    }
}

function encodeQuery(query: string): string {
    return encodeURIComponent(query.replace(/\s+/g, " ").trim());
}

export interface QueryResult {
    records: Array<Record>;
}

export type Record = any;
