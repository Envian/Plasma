"use babel";

import https from "https";
import { URL } from "url";

// TODO: Restore Tooling API
//import restPromise from "../rest-wrapper.js";

export const DIR_TO_OBJECT = {
    "classes": "ApexClass",
    "triggers": "ApexTrigger"
}

export function buildSubrequest(project) {
    return ({method, body, path, header, referenceId}) => {
        return {
            method: method || "GET",
            body: body,
            url: `/services/data/v${project.apiVersion}/tooling` + path,
            httpHeaders: header,
            referenceId: referenceId
        }
    }
}

export function buildCallout(project) {
    return async params => {
        const token = await project.getOauth();
        const options = {
            host: new URL(project.connection.baseurl).host,
            path: `/services/data/v${project.apiVersion}/tooling` + params.path,
            method: params.method || "GET",
            headers: { Authorization: token, "Content-Type": "application/json" },
            body: params.body
        };
        return restPromise(options);
    }
}
