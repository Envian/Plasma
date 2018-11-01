import ToolingRequest, { CompositeRequestItem } from "./tooling-request.js";
import Project from "../../project.js";
export default class CompositeRequest extends ToolingRequest<Array<CompositeRequestResultItem<any>>> {
    private readonly requests;
    constructor(allOrNothing: boolean, requests?: Array<ToolingRequest<any>>);
    addAll(requests: Array<ToolingRequest<any>>): void;
    add(request: ToolingRequest<any>): void;
    handleResponse(rawResponse: CompositeRequestResult<any>, statusCode: number): void;
    getSubrequest(project: Project): CompositeRequestItem;
    send(project: Project): Promise<Array<CompositeRequestResultItem<any>>>;
}
export interface CompositeRequestResult<T> {
    compositeResponse: Array<CompositeRequestResultItem<T>>;
}
export interface CompositeRequestResultItem<T> {
    body: Array<Error | T>;
    httpStatusCode: number;
}
