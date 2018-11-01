import ToolingRequest from "./tooling-request.js";

// TODO: add crud response type.
export default class CRUDRequest<T extends CRUDResult> extends ToolingRequest<T> {
    constructor(options: CRUDOptions) {
        super({
            path: `/sobjects/${options.sobject}/${options.id ? (options.id + "/") : ""}`,
            method: options.method
        }, options.body, options.referenceId);
    }
}

export interface CRUDOptions {
    sobject: string,
    method: string,
    id?: string,
    body?: any,
    referenceId?: string
}

export interface CRUDResult {
    id: string,
    success: boolean,
    errors: Array<undefined>, //TODO: Unused Attributes
    warnings: Array<undefined> // TODO: Unused Attributes
}
