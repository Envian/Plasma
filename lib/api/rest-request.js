"use babel";

import EventEmitter from "events";
import https from "https";

export default class RestRequest extends EventEmitter {
    constructor(options, body) {
        super();
        this.options = options;
        this.body = body;
    }

    async send(project) {
        this.body = await this.body;
        const options = await this.options || {};
        const body = typeof(this.body) === "string" ? this.body : JSON.stringify(this.body);

        options.headers = options.headers || {};

        if (body) {
            options.headers["Content-Length"] = body.length;
        }
        if (project) {
            options.headers.Authorization = await project.getOauth();
        }

        try {
            const result = await sendWithReauthenticate(options, body, project);
            this.emit("response", result);
            return result;
        } catch (error) {
            this.emit("error", error);
            throw error;
        }
    }
}

async function sendWithReauthenticate(options, body, project) {
    try {
        return await restWrapper(options, body);
    } catch (error) {
        if (project && error === "REAUTHENTICATE") {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            return this.send(project);
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
                        return resolve("");
                    case 401:
                    case 403:
                        return reject("REAUTHENTICATE")
                    default:
                        try {
                            data = JSON.parse(data);
                            data = data.error_description || data.error || data;
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
