import { URL } from "url";
import { trySend } from "../rest-request.js";

export default async function(id: string, token: string): Promise<UserInfoResult> {
    const fullUrl = new URL(id);
    const options = {
        host: fullUrl.host,
        path: fullUrl.pathname,
        method: "GET",
        headers: { Authorization: token }
    };
    // Will not 204
    return trySend<UserInfoResult>(options) as Promise<UserInfoResult>;
}

export interface UserInfoResult {
    username: string,
    user_id: string
}
