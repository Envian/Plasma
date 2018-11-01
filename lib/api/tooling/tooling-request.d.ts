/// <reference types="node" />
import { RequestOptions, OutgoingHttpHeaders } from "http";
import Project from "../../project.js";
export default class ToolingRequest<T> {
    error?: Error;
    protected readonly body: any;
    result?: T;
    statusCode?: number;
    private readonly options;
    private readonly referenceId;
    constructor(options: RequestOptions, body?: any, referenceId?: string);
    handleResponse(rawResponse: any, statusCode: number): void;
    getSubrequest(project: Project): CompositeRequestItem;
    send(project: Project): Promise<T | null>;
    sendRaw(project: Project): Promise<string | null>;
    getResult(): T;
}
export interface CompositeRequestItem {
    body: any;
    url: string;
    method: string;
    httpHeaders?: OutgoingHttpHeaders;
    referenceId: string;
}
