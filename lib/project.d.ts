/// <reference types="node" />
import { EventEmitter } from "events";
import { File, Directory } from "atom";
export default class Project extends EventEmitter {
    connection: ConnectionInfo;
    readonly root: Directory;
    readonly srcFolder: Directory;
    readonly packageXml: File;
    readonly configFile: File;
    readonly apiVersion: string;
    readonly loaded: boolean;
    readonly files: FileStatus;
    private loading;
    private _loaded;
    private _isNew;
    private _files;
    constructor(root: Directory);
    save(): Promise<void>;
    load(): Promise<void>;
    refreshAPIVersions(): Promise<void>;
    refreshFromServer(): Promise<void>;
    authenticate(type: ServerType): Promise<void>;
    reauthenticate(): Promise<String>;
    getToken(): Promise<string | null>;
    getOauth(): Promise<string>;
}
export declare enum ServerType {
    Sandbox = "Sandbox",
    Production = "Production",
    Developer = "Developer",
    Preview = "Preview",
}
export interface ConnectionInfo {
    authenticated: boolean;
    type: ServerType;
    api: string;
    versions: Array<string>;
    username: string;
    userid: string;
    baseurl: string;
    host: string;
    token_type: string;
    id: string;
}
export interface FileStatus {
    [key: string]: FileStatusItem;
}
export interface FileStatusItem {
    id: string;
    lastSyncDate: string;
    type: string;
}
export interface SaveFile {
    connection: ConnectionInfo;
    files: FileStatus;
}
