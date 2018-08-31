import { request } from "https";
import { RequestOptions } from "http";
import { getError } from "../helpers.js";
import Project from '../project.js';

const INVALID_SESSION = "INVALID_SESSION";

export async function sendAuth<T>(project: Project, options: RequestOptions, body?: any): Promise<[T | null, number]> {
    options.headers = options.headers || {};
    options.host = project.connection.host;
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    options.headers.Authorization = await project.getOauth();
    body = (!body || typeof(body) === "string") ? body: JSON.stringify(body);

    if (body) {
        options.headers["Content-Length"] = body.length;
    }

    try {
        const [response, code] = await restWrapper(options, body);
        return [response && (JSON.parse(response) as T) || null, code];
    } catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            options.host = project.connection.host;
            options.headers.Authorization = await project.getOauth();
            const [response, code] = await restWrapper(options, body);
            return [response && (JSON.parse(response) as T) || null, code];
        }
        throw error;
    }
}

export async function trySendAuth<T>(project: Project, options: RequestOptions, body?: any): Promise<T | null> {
    const [result, code] = await sendAuth<T>(project, options, body);
    switch (code) {
        case 200:
        case 201:
            return result;
        case 204:
            return null;
        default:
        // TODO: Parse result.
            console.log(result);
            throw new Error("OH NOES");
    }
}

export async function send<T>(options: RequestOptions, body?: any): Promise<[T | null, number]> {
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    body = (!body || typeof(body) === "string") ? body: JSON.stringify(body);

    if (body) {
        options.headers["Content-Length"] = body.length;
    }
    const [response, code] = await restWrapper(options, body);
    return [response && (JSON.parse(response) as T) || null, code];
}

export async function trySend<T>(options: RequestOptions, body?: any): Promise<T | null> {
    const [result, code] = await send<T>(options, body);
    switch (code) {
        case 200:
        case 201:
            return result;
        case 204:
            return null;
        default:
        // TODO: Parse result.
            console.log(result);
            throw new Error("OH NOES");
    }
}

function restWrapper(options: RequestOptions, body?: string): Promise<[string, number]> {
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
                        return resolve([data, conn.statusCode]);
                    case 204:
                        return resolve(["", conn.statusCode]);
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
