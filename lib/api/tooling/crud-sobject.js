"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const tooling_request_js_1 = require("./tooling-request.js");
class CRUDRequest extends tooling_request_js_1.default {
    constructor(options) {
        super({
            path: `/sobjects/${options.sobject}/` + (options.id ? (options.id + "/") : ""),
            method: options.method
        }, options.body, options.referenceId);
    }
}
exports.default = CRUDRequest;
