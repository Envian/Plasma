import ToolingRequest from "./tooling-request.js";
export default class CRUDRequest extends ToolingRequest<any> {
    constructor(options: CRUDOptions);
}
export interface CRUDOptions {
    sobject: string;
    method: string;
    id?: string;
    body: any;
    referenceId?: string;
}
