import { URL } from "url";
import { send } from "../rest-request.js";

export default async function(id: string, token: string): Promise<UserInfoResult> {
    const fullUrl = new URL(id);
    const options = {
        host: fullUrl.host,
        path: fullUrl.pathname,
        method: "GET",
        headers: { Authorization: token }
    };
    return send<UserInfoResult>(options);
}

export interface UserInfoResult {
    username: string,
    user_id: string
}
