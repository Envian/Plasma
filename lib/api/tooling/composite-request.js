"use babel";

import ToolingRequest from "./tooling-request.js";
import { getError } from "../../helpers.js";

export default class CompositeRequest extends ToolingRequest {
    constructor({ project, allOrNothing, requests }) {
        super({
            options: {
                path: "/composite",
                method: "POST"
            }, body: {
                allOrNone: !!allOrNothing,
                compositeRequest: []
            }
        });
        this.project = project;
        this.requests = [];
        this.addAll(requests || []);
    }

    addAll(requests) {
        for (const request of requests) {
            this.add(request);
        }
    }

    add(request) {
        if (this.requests.length === 25) {
            throw Error("Only 25 requests are allowed in a single composite request.");
        }
        this.requests.push(request);
        this.body.compositeRequest.push(request.getSubrequest(this.project));
    }

    getResult(rawResponse) {
        rawResponse.compositeResponse.forEach((response, index) => {
            const request = this.requests[index];
            switch (response.httpStatusCode) {
                case 200:
                case 201:
                case 204:
                    return request.resolve(request.getResult(response.body));
                default:
                    return request.reject(getError(response.body));
            }
        });
    }
}
