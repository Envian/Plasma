"use babel";

import ToolingRequest from "./tooling-request.js";

export default class CRUDRequest extends ToolingRequest<any> {
    constructor(options: CRUDOptions) {
        super({
            path: `/sobjects/${options.sobject}/` + (options.id ? (options.id + "/" ) : ""),
            method: options.method
        }, options.body, options.referenceId);
    }
}

export interface CRUDOptions {
    sobject: string,
    method: string,
    id?: string,
    body: any,
    referenceId?: string
}
