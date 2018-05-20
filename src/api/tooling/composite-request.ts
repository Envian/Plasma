"use babel";

import ToolingRequest from "./tooling-request.js";
import { getError } from "../../helpers.js";

export default class CompositeRequest extends ToolingRequest<Array<CompositeRequestResultItem>> {
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
        if (this.requests.length === 25) {
            throw Error("Only 25 requests are allowed in a single composite request.");
        }
        this.requests.push(request);
    }

    getResult(rawResponse: CompositeRequestResult): Array<CompositeRequestResultItem> {
        rawResponse.compositeResponse.forEach((response, index) => {
            const request = this.requests[index];
            switch (response.httpStatusCode) {
                case 200:
                case 201:
                case 204:
                    request.result = request.getResult(response.body);
                    break;
                default:
                    request.error = Error(getError(response.body));
                    break;
            }
        });
        return rawResponse.compositeResponse;
    }

    // TODO: Project typing.
    async send(project: any): Promise<Array<CompositeRequestResultItem>> {
        this.body.compositeRequest = this.requests.map(request => request.getSubrequest(project));
        return super.send(project)
    }
}

export interface CompositeRequestResult {
    compositeResponse: Array<CompositeRequestResultItem>
}

export interface CompositeRequestResultItem {
    body: any,
    httpStatusCode: number
}
