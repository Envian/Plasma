import ToolingRequest from "./tooling-request.js";
export default class CRUDRequest<T extends CRUDResult> extends ToolingRequest<T> {
    constructor(options: CRUDOptions);
}
export interface CRUDOptions {
    sobject: string;
    method: string;
    id?: string;
    body?: any;
    referenceId?: string;
}
export interface CRUDResult {
    id: string;
    success: boolean;
    errors: Array<undefined>;
    warnings: Array<undefined>;
}
