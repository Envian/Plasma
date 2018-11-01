/// <reference types="node" />
import { RequestOptions } from "http";
import Project from "../project.js";
export declare function sendAuth<T>(project: Project, options: RequestOptions, body?: any): Promise<[T | null, number]>;
export declare function trySendAuth<T>(project: Project, options: RequestOptions, body?: any): Promise<T | null>;
export declare function send<T>(options: RequestOptions, body?: any): Promise<[T | null, number]>;
export declare function trySend<T>(options: RequestOptions, body?: any): Promise<T | null>;
