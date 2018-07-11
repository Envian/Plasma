"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tooling_request_js_1 = tslib_1.__importDefault(require("./tooling-request.js"));
class CRUDRequest extends tooling_request_js_1.default {
    constructor(options) {
        super({
            path: `/sobjects/${options.sobject}/` + (options.id ? (options.id + "/") : ""),
            method: options.method
        }, options.body, options.referenceId);
    }
}
exports.default = CRUDRequest;
