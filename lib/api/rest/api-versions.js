"use babel";

import RestRequest from "../rest-request.js";

export default function(host) {
    return new ApiVersionRequest(host);
}

class ApiVersionRequest extends RestRequest {
    constructor(host) {
        super({ host, path: "/services/data" });
    }

    async send() {
        const results = await super.send();
        return results.map(result => result.version);
    }
}
