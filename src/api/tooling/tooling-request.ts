import { RequestOptions, OutgoingHttpHeaders } from "http";
import { sendAuth, sendAuthRaw } from "../rest-request.js";
import Project from "../../project.js";

let counter = 0;
function UNIQUE_REFERENCE() { return "Unused_Reference_" + counter++; }

export default class ToolingRequest<T>{
    public error?: Error;

    protected readonly body: any;
    public result?: T;
    public statusCode?: number;
    private readonly options: RequestOptions;
    private readonly referenceId: string;

    constructor(options: RequestOptions, body?: any, referenceId?: string) {
        this.options = options;
        this.body = body;
        this.referenceId = referenceId || UNIQUE_REFERENCE();
    }

    // When overloaded, translates the raw response from the server into a more useful response.
    handleResponse(rawResponse: any, statusCode: number): void {
        this.result = rawResponse;
        this.statusCode = statusCode;
    }

    // Returns a subrequest for use in composite requests.
    getSubrequest(project: Project): CompositeRequestItem {
        return {
            body: this.body,
            url: `/services/data/v${project.apiVersion}/tooling` + this.options.path,
            method: this.options.method || "GET",
            httpHeaders: this.options.headers,
            referenceId: this.referenceId || ("UnusedReference_" + counter++)
        }
    }

    async send(project: Project): Promise<T | null> {
        this.options.path = `/services/data/v${project.apiVersion}/tooling` + this.options.path;
        try {
            const [result, statusCode] = await sendAuth<T>(project, this.options, this.body);
            this.handleResponse(result, statusCode);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async sendRaw(project: Project): Promise<string | null> {
        this.options.path = `/services/data/v${project.apiVersion}/tooling` + this.options.path;
        try {
            const [result, statusCode] = await sendAuthRaw(project, this.options, this.body);
            this.handleResponse(result, statusCode);
            return result;
        } catch (error) {
            throw error;
        }
    }

    getResult(): T {
        if (this.result) return this.result;
        else throw Error("Request has not been sent.")
    }
}

export interface CompositeRequestItem {
    body: any,
    url: string,
    method: string,
    httpHeaders?: OutgoingHttpHeaders,
    referenceId: string
}
