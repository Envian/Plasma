"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tooling_request_js_1 = tslib_1.__importDefault(require("./tooling-request.js"));
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
        if (this.requests.length >= 25) {
            throw Error("Only 25 requests are allowed in a single composite request.");
        }
        this.requests.push(request);
    }
    handleResponse(rawResponse, statusCode) {
        this.result = rawResponse.compositeResponse;
        rawResponse.compositeResponse.forEach((response, index) => {
            const request = this.requests[index];
            request.handleResponse(response.body, response.httpStatusCode);
        });
    }
    getSubrequest(project) {
        throw Error("Unable to nest composite requests.");
    }
    async send(project) {
        this.body.compositeRequest = this.requests.map(request => request.getSubrequest(project));
        return super.send(project);
    }
}
exports.default = CompositeRequest;
