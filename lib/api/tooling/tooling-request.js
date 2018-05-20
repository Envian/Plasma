"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_request_js_1 = require("../rest-request.js");
let counter = 0;
function UNIQUE_REFERENCE() { return "Unused_Reference_" + counter++; }
class ToolingRequest {
    constructor(options, body, referenceId) {
        this.options = options;
        this.body = body;
        this.referenceId = referenceId || UNIQUE_REFERENCE();
    }
    getResult(rawResponse) {
        return rawResponse;
    }
    getSubrequest(project) {
        return {
            body: this.body,
            url: `/services/data/v${project.apiVersion}/tooling` + this.options.path,
            method: this.options.method || "GET",
            httpHeaders: this.options.headers,
            referenceId: this.referenceId || ("UnusedReference_" + counter++)
        };
    }
    async send(project) {
        this.options.path = `/services/data/v${project.apiVersion}/tooling` + this.options.path;
        try {
            this.result = this.getResult(await rest_request_js_1.sendAuth(this.options, this.body, project));
            return this.result;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = ToolingRequest;
