import ToolingRequest, { CompositeRequestItem } from "./tooling-request.js";
import Project from "../../project.js";

export default class CompositeRequest extends ToolingRequest<Array<CompositeRequestResultItem<any>>> {
    private readonly requests: Array<ToolingRequest<any>>;

    constructor(allOrNothing: boolean, requests?: Array<ToolingRequest<any>>) {
        super({ path: "/composite", method: "POST" }, { allOrNone: allOrNothing });
        this.requests = [];
        requests && this.addAll(requests);
    }

    addAll(requests: Array<ToolingRequest<any>>): void {
        for (const request of requests) {
            this.add(request);
        }
    }

    add(request : ToolingRequest<any>): void {
        if (this.requests.length >= 25) {
            throw Error("Only 25 requests are allowed in a single composite request.");
        }
        this.requests.push(request);
    }

    handleResponse(rawResponse: CompositeRequestResult<any>, statusCode: number): void {
        // TODO: Handle possible errors.
        this.result = rawResponse.compositeResponse;
        rawResponse.compositeResponse.forEach((response, index) => {
            const request = this.requests[index];
            request.handleResponse(response.body, response.httpStatusCode);
        });
    }

    getSubrequest(project: Project): CompositeRequestItem {
        throw Error("Unable to nest composite requests.");
    }

    async send(project: Project): Promise<Array<CompositeRequestResultItem<any>>> {
        this.body.compositeRequest = this.requests.map(request => request.getSubrequest(project));
        return super.send(project) as Promise<Array<CompositeRequestResultItem<any>>>;
    }
}

export interface CompositeRequestResult<T> {
    compositeResponse: Array<CompositeRequestResultItem<T>>
}

export interface CompositeRequestResultItem<T> {
    body: Array<Error | T>,
    httpStatusCode: number
}
