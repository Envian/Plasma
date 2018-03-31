"use babel";

const CLIENT_ID = "3MVG9g9rbsTkKnAUsShwsp_kK_RHkTCRVKUcbvJuLIwkDpeCSMGmIupQQgcpSo26L_qyQt4HsDXeuvowD5OVs";

import { URL } from "url";
import restPromise from "./rest-wrappers.js";

function toUrlString(params) {
    return Object.entries(params).map(pair => pair.map(encodeURIComponent).join("=")).join("&");
}

export function getLoginPath(username) {
    const params = {
        response_type: "token",
        client_id: CLIENT_ID,
        redirect_uri: "plasma://authenticated",
        display: "popup",
        scope: "full refresh_token",
        login_hint: /.+@.+\..+/g.test(username) && username || ""
    };
    return "/services/oauth2/authorize?" + toUrlString(params);
}

export default {
    async getUserInfo(id, token) {
        const fullUrl = new URL(id);
        const userinfo = await restPromise({ host: fullUrl.host, path: fullUrl.pathname, headers: { Authorization: token }});
        return [userinfo.user_id, userinfo.username];
    },

    async refreshToken(host, token) {
        const body = toUrlString({
            grant_type: "refresh_token",
            refresh_token: token,
            client_id: CLIENT_ID,
            format: "json"
        });
        return restPromise({ host,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            path: "/services/oauth2/token",
            body
        });
    },

    async getAPIVersions(host) {
        const versions = await restPromise({ host, path: "/services/data" });
        return versions.reverse().map(version => version.version);
    },
}
