import ToolingRequest from "./tooling-request.js";
export default class Query extends ToolingRequest<Array<Record>> {
    constructor(query: string, referenceId?: string);
    handleResponse(rawResponse: QueryResult, statusCode: number): void;
}
export interface QueryResult {
    records: Array<Record>;
}
export declare type Record = any;
