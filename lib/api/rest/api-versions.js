"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_request_js_1 = require("../rest-request.js");
async function default_1(host) {
    return (await rest_request_js_1.send({ host, path: "/services/data" })).map(api => api.version).reverse();
}
exports.default = default_1;
