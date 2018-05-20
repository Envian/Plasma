"use babel";

import { RequestOptions, OutgoingHttpHeaders } from "http";
import { sendAuth } from "../rest-request.js";

let counter = 0;
function UNIQUE_REFERENCE() { return "Unused_Reference_" + counter++; }

export default class ToolingRequest<T>{
    public result?: T;
    public error?: Error;

    protected readonly body: any;
    private readonly options: RequestOptions;
    private readonly referenceId: string;

    constructor(options: RequestOptions, body: any, referenceId?: string) {
        this.options = options;
        this.body = body;
        this.referenceId = referenceId || UNIQUE_REFERENCE();
    }

    // When overloaded, translates the raw response from the server into a more useful response.
    getResult(rawResponse: any): T {
        return rawResponse as T;
    }

    // TODO: Fix project typing.
    getSubrequest(project: any): CompositeRequestItem {
        return {
            body: this.body,
            url: `/services/data/v${project.apiVersion}/tooling` + this.options.path,
            method: this.options.method || "GET",
            httpHeaders: this.options.headers,
            referenceId: this.referenceId || ("UnusedReference_" + counter++)
        }
    }

    // TODO: Fix project typing.
    async send(project: any): Promise<T> {
        this.options.path = `/services/data/v${project.apiVersion}/tooling` + this.options.path;
        try {
            this.result = this.getResult(await sendAuth(this.options, this.body, project));
            return this.result;
        } catch (error) {
            throw error;
        }
    }
}

export interface CompositeRequestItem {
    body: any,
    url: string,
    method: string,
    httpHeaders?: OutgoingHttpHeaders,
    referenceId: string
}
