"use babel";

import { URL } from "url";
import RestRequest from "../rest-request.js";

export default function(id, token) {
    return new UserInfoRequest(id, token);
}

class UserInfoRequest extends RestRequest {
    constructor(id, token) {
        super();
        const fullUrl = new URL(id);
        this.options = {
            host: fullUrl.host,
            path: fullUrl.pathname,
            method: "GET",
            headers: { Authorization: token }
        };
    }

    async send(project) {
        const result = await super.send(project);
        return [result.user_id, result.username];
    }
}
