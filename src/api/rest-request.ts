import { request } from "https";
import { RequestOptions } from "http";
import { getError } from "../helpers.js";

const INVALID_SESSION = "INVALID_SESSION";

// TODO: fix project typing.
export async function sendAuth<T>(project: any, options: RequestOptions, body?: any): Promise<T> {
    options.headers = options.headers || {};
    options.host = project.connection.host;
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    options.headers.Authorization = await project.getOauth();
    body = (!body || typeof(body) === "string") ? body: JSON.stringify(body);

    if (body) {
        options.headers["Content-Length"] = body.length;
    }

    try {
        return JSON.parse(await restWrapper(options, body));
    } catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            options.host = project.connection.host;
            options.headers.Authorization = await project.getOauth();
            return JSON.parse(await restWrapper(options, body));
        }
        throw error;
    }
}

export async function send<T>(options: RequestOptions, body?: any): Promise<T> {
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    body = (!body || typeof(body) === "string") ? body: JSON.stringify(body);

    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    return JSON.parse(await restWrapper(options, body));
}

function restWrapper(options: RequestOptions, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const restRequest = request(options);
        restRequest.on("response", conn => {
            let data = "";
            conn.setEncoding("utf8");

            conn.on("data", (chunk: string) => data += chunk);
            conn.on("end", () => {
                switch (conn.statusCode) {
                    case 200:
                    case 201:
                        return resolve(data);
                    case 204:
                        return resolve("");
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
        restRequest.on("error", error => {
            reject(error);
        });
        restRequest.end(body);
    });
}
