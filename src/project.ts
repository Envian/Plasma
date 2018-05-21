"use babel";

import { setPassword, getPassword } from "keytar";
import { EventEmitter } from "events";
import { File, Directory, WorkspaceOpenOptions } from "atom";

import { register } from "./project-manager.js";

import { refreshToken } from "./api/rest/login.js";
import getApiVersions from "./api/rest/api-versions.js";
import getUserInfo from "./api/rest/user-info.js";
import retrieve from "./api/metadata/retrieve.js";


export default class Project extends EventEmitter {
    public connection: ConnectionInfo;
    public readonly root: Directory;
    public readonly srcFolder: Directory;
    public readonly packageXml: File;
    public readonly configFile: File;

    public get apiVersion(): string {
        return this.connection.api || this.connection.versions && this.connection.versions[0];
    }
    public get loaded(): boolean {
        return this._loaded;
    }
    public get files(): FileStatus {
        return this._files;
    }


    private loading: boolean;
    private _loaded: boolean;
    private _isNew: boolean;
    private _files: FileStatus;

    constructor(root: Directory) {
        super();

        this.root = root;
        this.srcFolder = root.getSubdirectory("src");
        this.packageXml = this.srcFolder.getFile("package.xml");
        this.configFile = root.getSubdirectory("config").getFile("plasma.json");

        this.loading = false;
        this._loaded = false;
        this._isNew = true;

        this._files = {};
        this.connection = {
            authenticated: false,
            type: ServerType.Sandbox,
            api: "",
            versions: [],
            username: "",
            userid: "",
            baseurl: "",
            host: "",
            token_type: "",
            id: ""
        };
console.log(this);
    }

    async save(): Promise<void> {
        // TODO: Saving Check?
        try {
            await this.configFile.create();
            await this.configFile.write(JSON.stringify({
                connection: this.connection,
                files: this.files
            }, null, 4));

            if (this._isNew) {
                register(this);
                this._isNew = false;
                this._loaded = true;
            }

            this.emit("save");
        } catch (ex) {
            atom.notifications.addError(`Failed to save project.\nDirectory: ${this.root.getPath()}\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }

    async load(): Promise<void> {
        // TODO: when already loading, how about waiting for the load event to fire isntead of returning immidiately
        if (this.loaded || this.loading) return;
        this.loading = true;

        try {
            const saveFile = await this.configFile.read();
            if (!saveFile) {
                this.loading = false;
                return;
            }
            const saveData = JSON.parse(saveFile) as SaveFile;

            Object.assign(this.connection, saveData.connection);
            Object.assign(this.files, saveData.files);
            register(this);

            this._isNew = false;
            this._loaded = true;
            this.loading = false;
            this.emit("load");
        } catch (ex) {
            this.loading = false;
            atom.notifications.addError(`Failed to load project.\nDirectory: ${this.root.getPath()}\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }

    async refreshAPIVersions(): Promise<void> {
        // TODO: Already updating check?
        this.connection.versions = await getApiVersions(this.connection.host);
        return this.save();
    }

    async refreshFromServer(): Promise<void> {
        // TODO: already refreshing check?
        try {
            const { files, zip } = await retrieve(this);
            Object.assign(this.files, files);
            const savePromise = this.save();

            await Promise.all(Object.entries(zip.files).map(async ([dir, zipObj]: [string, any]) => {
                const data = await zipObj.async("string");
                return this.srcFolder.getFile(dir).write(data);
            }));
            await savePromise;
            atom.notifications.addSuccess("Successfully refreshed from server.");
        } catch (ex) {
            console.log(ex);
            atom.notifications.addError(`Failed to refresh from server.\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }

    // Prompts the user to authenticate. Simply never returns if the user opts not to authenticate.
    async authenticate(type: ServerType): Promise<void> {
        // TODO: Fix authorization callback
        const result = await new Promise<any>(accept => {
            atom.workspace.open("plasma://authenticate", {
                type: type,
                username: this.connection.username,
                callback: accept
            } as WorkspaceOpenOptions);
        });

        if (result.error === "access_denied") {
            atom.notifications.addWarning("Credentials not updated.");
            return;
        }

        const host = new URL(result.instance_url).host;
        const [userInfo, versions] = await Promise.all([
            getUserInfo(result.id, result.token_type + " " + result.access_token),
            getApiVersions(host)
        ]);

        this.connection.authenticated = true;
        this.connection.type = type;
        this.connection.versions = versions;
        this.connection.username = userInfo.username;
        this.connection.userid = userInfo.user_id;
        this.connection.baseurl = result.instance_url;
        this.connection.host = host;
        this.connection.token_type = result.token_type;
        this.connection.id = result.id;

        if (!this._isNew) {
            await this.save();
        }

        setPassword("plasma-salesforce", result.id, result.access_token);
        setPassword("plasma-salesforce-refresh", result.id, result.refresh_token);
        atom.notifications.addSuccess(`Credentials for ${this.connection.username} successfully updated.`);
        this.emit("authenticate");
    }

    async reauthenticate(): Promise<String> {
        const refreshKey = getPassword("plasma-salesforce-refresh", this.connection.id);
        const host = this.connection.type === "Sandbox" ? "test.salesforce.com" : "login.salesforce.com";
        const result = await refreshToken(host, await refreshKey as string);

        this.connection.baseurl = result.instance_url;
        this.connection.host = new URL(result.instance_url).host;
        this.connection.token_type = result.token_type;
        this.connection.id = result.id;

        this.save();
        await setPassword("plasma-salesforce", this.connection.id, result.access_token);
        return result.access_token;
    }

    async getToken() {
        return getPassword("plasma-salesforce", this.connection.id);
    }

    async getOauth() {
        return this.connection.token_type + " " + await this.getToken();
    }
}

export enum ServerType {
    Sandbox = "Sandbox",
    Production = "Production",
    Developer = "Developer",
    Preview = "Preview"
}

export interface ConnectionInfo {
    authenticated: boolean,
    type: ServerType,
    api: string,
    versions: Array<string>,
    username: string,
    userid: string,
    baseurl: string,
    host: string,
    token_type: string,
    id: string
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
    connection: ConnectionInfo,
    files: FileStatus
}
