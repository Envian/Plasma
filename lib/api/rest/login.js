"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_request_js_1 = require("../rest-request.js");
const CLIENT_ID = "3MVG9g9rbsTkKnAUsShwsp_kK_RHkTCRVKUcbvJuLIwkDpeCSMGmIupQQgcpSo26L_qyQt4HsDXeuvowD5OVs";
function toUrlString(params) {
    return Object.entries(params).map(pair => pair.map(encodeURIComponent).join("=")).join("&");
}
function getLoginPath(username) {
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
exports.getLoginPath = getLoginPath;
async function refreshToken(host, token) {
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
    return rest_request_js_1.send(options, body);
}
exports.refreshToken = refreshToken;
