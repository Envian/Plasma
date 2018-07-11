import { send } from "../rest-request.js";

export default async function(host: string): Promise<Array<string>> {
    return (await send<Array<APIResponseItem>>(
        { host, path: "/services/data" }
    )).map(api => api.version).reverse();
}

interface APIResponseItem {
    version: string
}
