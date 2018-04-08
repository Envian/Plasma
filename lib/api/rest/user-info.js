"use babel";

import { URL } from "url";
import restRequest from "../rest-request.js";

export default async function(id, token) {
    const fullUrl = new URL(id);
    const options = {
        host: fullUrl.host,
        path: fullUrl.pathname,
        method: "GET",
        headers: { Authorization: token }
    };
    return restRequest({ options });
}
