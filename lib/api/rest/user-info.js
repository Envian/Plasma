"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const rest_request_js_1 = require("../rest-request.js");
async function default_1(id, token) {
    const fullUrl = new url_1.URL(id);
    const options = {
        host: fullUrl.host,
        path: fullUrl.pathname,
        method: "GET",
        headers: { Authorization: token }
    };
    return rest_request_js_1.trySend(options);
}
exports.default = default_1;
