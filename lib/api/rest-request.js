"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
const helpers_js_1 = require("../helpers.js");
const INVALID_SESSION = "INVALID_SESSION";
async function sendAuth(project, options, body) {
    options.headers = options.headers || {};
    options.host = project.connection.host;
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    options.headers.Authorization = await project.getOauth();
    body = (!body || typeof (body) === "string") ? body : JSON.stringify(body);
    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    try {
        return JSON.parse(await restWrapper(options, body));
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
            return JSON.parse(await restWrapper(options, body));
        }
        throw error;
    }
}
exports.sendAuth = sendAuth;
async function send(options, body) {
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    body = (!body || typeof (body) === "string") ? body : JSON.stringify(body);
    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    return JSON.parse(await restWrapper(options, body));
}
exports.send = send;
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
                        return resolve(data);
                    case 204:
                        return resolve("");
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
