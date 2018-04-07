"use babel";

import ToolingRequest from "./tooling-request.js";

export default class CRUDRequest extends ToolingRequest {
    constructor({ sobject, method, id, body, referenceId }) {
        super({
            options: {
                path: `/sobjects/${sobject}/` + (id ? (id + "/" ) : ""),
                method: method
            }, body, referenceId
        });
    }
}
