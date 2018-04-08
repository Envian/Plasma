"use babel";

import restRequest from "../rest-request.js";

export default async function(host) {
    return (await restRequest({
        options: { host, path: "/services/data" }
    })).map(api => api.version).reverse();
}
