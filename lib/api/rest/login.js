"use babel";

import RestRequest from "../rest-request.js";

const CLIENT_ID = "3MVG9g9rbsTkKnAUsShwsp_kK_RHkTCRVKUcbvJuLIwkDpeCSMGmIupQQgcpSo26L_qyQt4HsDXeuvowD5OVs";

function toUrlString(params) {
    return Object.entries(params).map(pair => pair.map(encodeURIComponent).join("=")).join("&");
}

function login(username) {
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

function refresh(host, token) {
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
    return new RestRequest(options, body);
}

export default { getLoginPath: login, refreshToken: refresh };
