import ToolingRequest from "./tooling-request.js";
export default class CompositeRequest extends ToolingRequest<Array<CompositeRequestResultItem>> {
    private readonly requests;
    constructor(allOrNothing: boolean, requests?: Array<ToolingRequest<any>>);
    addAll(requests: Array<ToolingRequest<any>>): void;
    add(request: ToolingRequest<any>): void;
    getResult(rawResponse: CompositeRequestResult): Array<CompositeRequestResultItem>;
    send(project: any): Promise<Array<CompositeRequestResultItem>>;
}
export interface CompositeRequestResult {
    compositeResponse: Array<CompositeRequestResultItem>;
}
export interface CompositeRequestResultItem {
    body: any;
    httpStatusCode: number;
}
