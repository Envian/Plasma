/// <reference types="node" />
import { RequestOptions, OutgoingHttpHeaders } from "http";
export default class ToolingRequest<T> {
    error?: Error;
    protected readonly body: any;
    result?: T;
    private readonly options;
    private readonly referenceId;
    constructor(options: RequestOptions, body: any, referenceId?: string);
    translateResponse(rawResponse: any): T;
    getSubrequest(project: any): CompositeRequestItem;
    send(project: any): Promise<T>;
    getResult(): T;
}
export interface CompositeRequestItem {
    body: any;
    url: string;
    method: string;
    httpHeaders?: OutgoingHttpHeaders;
    referenceId: string;
}
