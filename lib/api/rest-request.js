"use babel";

import https from "https";

import { getError } from "../helpers.js";

const INVALID_SESSION = "INVALID_SESSION";

export default send;

async function send({ options, body, project }) {
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    body = (!body || typeof(body) === "string") ? body : JSON.stringify(body);

    if (project) {
        options.host = project.connection.host;
        options.headers.Authorization = await project.getOauth();
    }

    if (body) {
        options.headers["Content-Length"] = body.length;
    }

    try {
        return await restWrapper(options, body);
    } catch (error) {
        if (project && error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            return send({ options, body, project });
        }
        throw error;
    }
}

async function restWrapper(options, body) {
    return new Promise((resolve, reject) => {
        const request = https.request(options);
        request.on("response", conn => {
            let data = "";
            conn.setEncoding("utf8");

            conn.on("data", chunk => data += chunk);
            conn.on("end", () => {
                switch (conn.statusCode) {
                    case 200:
                    case 201:
                        return resolve(JSON.parse(data));
                    case 204:
                        return resolve(null);
                    case 401:
                    case 403:
                        return reject(INVALID_SESSION)
                    default:
                        try {
                            data = getError(JSON.parse(data));
                        } catch (ex) {}
                        return reject(Error(data));
                }
            });
        });
        request.on("error", error => {
            reject(error);
        });
        request.end(body);
    });
}
