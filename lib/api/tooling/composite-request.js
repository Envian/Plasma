"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const tooling_request_js_1 = require("./tooling-request.js");
const helpers_js_1 = require("../../helpers.js");
class CompositeRequest extends tooling_request_js_1.default {
    constructor(allOrNothing, requests) {
        super({ path: "/composite", method: "POST" }, { allOrNone: allOrNothing });
        this.requests = [];
        requests && this.addAll(requests);
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
    }
    translateResponse(rawResponse) {
        rawResponse.compositeResponse.forEach((response, index) => {
            const request = this.requests[index];
            switch (response.httpStatusCode) {
                case 200:
                case 201:
                case 204:
                    request.result = request.translateResponse(response.body);
                    break;
                default:
                    request.error = Error(helpers_js_1.getError(response.body));
                    break;
            }
        });
        return rawResponse.compositeResponse;
    }
    async send(project) {
        this.body.compositeRequest = this.requests.map(request => request.getSubrequest(project));
        return super.send(project);
    }
}
exports.default = CompositeRequest;
