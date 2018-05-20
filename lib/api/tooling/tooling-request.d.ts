/// <reference types="node" />
import { RequestOptions, OutgoingHttpHeaders } from "http";
export default class ToolingRequest<T> {
    result?: T;
    error?: Error;
    protected readonly body: any;
    private readonly options;
    private readonly referenceId;
    constructor(options: RequestOptions, body: any, referenceId?: string);
    getResult(rawResponse: any): T;
    getSubrequest(project: any): CompositeRequestItem;
    send(project: any): Promise<T>;
}
export interface CompositeRequestItem {
    body: any;
    url: string;
    method: string;
    httpHeaders?: OutgoingHttpHeaders;
    referenceId: string;
}
