"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const tooling_request_js_1 = require("./tooling-request.js");
class Query extends tooling_request_js_1.default {
    constructor(query, referenceId) {
        super({ method: "GET", path: "/query/?q=" + encodeQuery(query) }, referenceId);
    }
    getResult(rawResponse) {
        return rawResponse.records;
    }
}
exports.default = Query;
function encodeQuery(query) {
    encodeURIComponent(query.replace(/\s+/g, " ").trim());
}
