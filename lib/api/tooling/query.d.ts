import ToolingRequest from "./tooling-request.js";
export default class Query extends ToolingRequest<Array<any>> {
    constructor(query: string, referenceId?: string);
    translateResponse(rawResponse: QueryResult): Array<any>;
}
export interface QueryResult {
    records: Array<any>;
}
