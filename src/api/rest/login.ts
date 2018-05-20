"use babel";

import { send } from "../rest-request.js";

const CLIENT_ID = "3MVG9g9rbsTkKnAUsShwsp_kK_RHkTCRVKUcbvJuLIwkDpeCSMGmIupQQgcpSo26L_qyQt4HsDXeuvowD5OVs";

function toUrlString(params: { [key: string]: string }): string {
    return Object.entries(params).map(pair => pair.map(encodeURIComponent).join("=")).join("&");
}

export function getLoginPath(username?: string): string {
    const params = {
        response_type: "token",
        client_id: CLIENT_ID,
        redirect_uri: "plasma://authenticated",
        display: "popup",
        scope: "full refresh_token",
        login_hint: username && /.+@.+\..+/g.test(username) && username || ""
    };
    return "/services/oauth2/authorize?" + toUrlString(params);
}

export async function refreshToken(host: string, token: string): Promise<RefreshResult> {
    const body = toUrlString({
        grant_type: "refresh_token",
        refresh_token: token,
        client_id: CLIENT_ID,
        format: "json"
    });
    const options = {
        host,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": body.length
        },
        method: "POST",
        path: "/services/oauth2/token"
    };
    return send<RefreshResult>(options, body);
}

export interface RefreshResult {
    instance_url: string,
    token_type: string,
    id: string,
    access_token: string
}
