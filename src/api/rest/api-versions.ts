import { trySend } from "../rest-request.js";

export default async function(host: string): Promise<Array<string>> {
    return (await trySend<Array<APIResponseItem>>(
        { host, path: "/services/data" }
    ) as Array<APIResponseItem>).map(api => api.version).reverse();
    // Will not 204
}

interface APIResponseItem {
    version: string
}
