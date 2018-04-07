"use babel";

import restRequest from "../rest-request.js";

let counter = 0;
function UNIQUE_REFERENCE() { return "Unused_Reference_" + counter++; }

export default class ToolingRequest {
    constructor({ options, body, referenceId }) {
        this.options = options;
        this.body = body;
        this.referenceId = referenceId || UNIQUE_REFERENCE();
        this.result = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    // Overloads to get the correct response for an implemented method
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
        }
    }

    async send(project) {
        this.options.path = `/services/data/v${project.apiVersion}/tooling` + this.options.path;
        try {
            const result = this.getResult(await restRequest({
                options: this.options,
                body: this.body,
                project: project
            }));
            this.resolve(result);
            return result;
        } catch (error) {
            this.reject(error);
            throw error;
        }
    }
}
