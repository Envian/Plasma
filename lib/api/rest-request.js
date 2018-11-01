"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
const helpers_js_1 = require("../helpers.js");
const INVALID_SESSION = "INVALID_SESSION";
async function sendAuth(project, options, body) {
    const [response, code] = await sendAuthRaw(project, options, body);
    return [response && JSON.parse(response) || null, code];
}
exports.sendAuth = sendAuth;
async function sendAuthRaw(project, options, body) {
    options.headers = options.headers || {};
    options.host = project.connection.host;
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    options.headers.Authorization = await project.getOauth();
    body = (!body || typeof (body) === "string") ? body : JSON.stringify(body);
    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    try {
        const [response, code] = await restWrapper(options, body);
        return [response || null, code];
    }
    catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            }
            catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            options.host = project.connection.host;
            options.headers.Authorization = await project.getOauth();
            const [response, code] = await restWrapper(options, body);
            return [response || null, code];
        }
        throw error;
    }
}
exports.sendAuthRaw = sendAuthRaw;
async function trySendAuth(project, options, body) {
    const [result, code] = await sendAuth(project, options, body);
    switch (code) {
        case 200:
        case 201:
            return result;
        case 204:
            return null;
        default:
            console.log(result);
            throw new Error("OH NOES");
    }
}
exports.trySendAuth = trySendAuth;
async function send(options, body) {
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    body = (!body || typeof (body) === "string") ? body : JSON.stringify(body);
    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    const [response, code] = await restWrapper(options, body);
    return [response && JSON.parse(response) || null, code];
}
exports.send = send;
async function trySend(options, body) {
    const [result, code] = await send(options, body);
    switch (code) {
        case 200:
        case 201:
            return result;
        case 204:
            return null;
        default:
            console.log(result);
            throw new Error("OH NOES");
    }
}
exports.trySend = trySend;
function restWrapper(options, body) {
    return new Promise((resolve, reject) => {
        const restRequest = https_1.request(options);
        restRequest.on("response", conn => {
            let data = "";
            conn.setEncoding("utf8");
            conn.on("data", (chunk) => data += chunk);
            conn.on("end", () => {
                switch (conn.statusCode) {
                    case 200:
                    case 201:
                        return resolve([data, conn.statusCode]);
                    case 204:
                        return resolve(["", conn.statusCode]);
                    case 401:
                    case 403:
                        return reject(INVALID_SESSION);
                    default:
                        try {
                            data = helpers_js_1.getError(JSON.parse(data));
                        }
                        catch (ex) { }
                        return reject(Error(data));
                }
            });
        });
        restRequest.on("error", error => {
            reject(error);
        });
        restRequest.end(body);
    });
}
