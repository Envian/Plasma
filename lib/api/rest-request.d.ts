/// <reference types="node" />
import { RequestOptions } from "http";
export declare function sendAuth<T>(project: any, options: RequestOptions, body?: any): Promise<T>;
export declare function send<T>(options: RequestOptions, body?: any): Promise<T>;
