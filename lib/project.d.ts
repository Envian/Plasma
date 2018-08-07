/// <reference types="node" />
import { EventEmitter } from "events";
import { File, Directory } from "atom";
import { findProjectForFile, findProjectForDirectory, getProjectForFilesAndDirs } from "./project-manager.js";
import { AuthorizationResult, ServerType } from "./components/auth-view.js";
import { UserInfoResult } from "./api/rest/user-info.js";
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
    private _files;
    constructor(root: Directory);
    save(): Promise<void>;
    load(): Promise<void>;
    refreshAPIVersions(): Promise<void>;
    refreshFromServer(): Promise<void>;
    authenticate(type: ServerType): Promise<void>;
    handleAuthResult(result: AuthorizationResult, type: ServerType, connectionInfo?: [Promise<UserInfoResult>, Promise<string[]>]): Promise<void>;
    reauthenticate(): Promise<String>;
    getToken(): Promise<string | null>;
    getOauth(): Promise<string>;
    findProjectForFile: typeof findProjectForFile;
    findProjectForDirectory: typeof findProjectForDirectory;
    getProjectForFilesAndDirs: typeof getProjectForFilesAndDirs;
}
export declare class ConnectionInfo {
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
