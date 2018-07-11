"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tooling_request_js_1 = tslib_1.__importDefault(require("./tooling-request.js"));
class Query extends tooling_request_js_1.default {
    constructor(query, referenceId) {
        super({ method: "GET", path: "/query/?q=" + encodeQuery(query) }, referenceId);
    }
    translateResponse(rawResponse) {
        return rawResponse.records;
    }
}
exports.default = Query;
function encodeQuery(query) {
    encodeURIComponent(query.replace(/\s+/g, " ").trim());
}
