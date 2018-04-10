"use babel";

import EventEmitter from "events";
import keytar from "keytar";

import { File, Directory } from "atom";

import ProjectManager from "./project-manager.js";
import RestAPI from "./api/rest.js";
import MetadataAPI from "./api/metadata.js";
import ToolingAPI from "./api/tooling.js";

export default class Project extends EventEmitter {
    get apiVersion() {
        return this.connection.api || this.connection.versions && this.connection.versions[0];
    }

    get root() { return this._root; }
    set root(value) {
        if (!this.isNew) return;

        this._root = value;
        this.srcFolder = value && value.getSubdirectory("src");
        this.packageXml = value && value.getSubdirectory("src").getFile("package.xml");
        this.configFile = value && value.getSubdirectory("config").getFile("plasma.json");
    }


    constructor(root) {
        super();

        this.configFile = null;
        this.packageXml = null;
        this.srcFolder = null;

        this.isNew = true;
        this.loaded = false;
        this.root = root || null;

        this.metadata = {};
        this.connection = {
            authenticated: false,
            type: "Sandbox",
            api: "",
            versions: [],
            username: "",
            userid: "",
            baseurl: "",
            host: "",
            token_type: "",
            id: ""
        };
    }

    async save() {
        if (!this.root) {
            throw Error("Unable to save project: Project root not defined.");
        }

        return async () => {
            await this.configFile.create();
            await this.configFile.write(JSON.stringify({
                connection: this.connection,
                metadata: this.metadata
            }, null, 4));

            if (this.isNew) {
                ProjectManager.register(this);
                this.isNew = false;
                this.loaded = true;
            }
            this.emit("update");
        }().catch(err => {
            atom.notifications.addError(`Failed to save project.\nDirectory: ${this.root.getPath()}\nError: ${err.message}`, {
                dismissable: true
            });
        });
    }

    async load() {
        if (this.loaded) return;
        if (!this.root) {
            throw Error("Unable to load project: Project root not defined.");
        }
        this.loaded = true;

        return async () => {
            const saveFile = JSON.parse(await this.configFile.read());
            if (!saveFile) {
                this.loaded = false;
                return;
            }

            Object.assign(this.connection, saveFile.connection);
            Object.assign(this.metadata, saveFile.metadata);

            ProjectManager.register(this);

            this.isNew = false;
            this.emit("load");
        }().catch(err => {
            atom.notifications.addError(`Failed to load project.\nDirectory: ${this.root.getPath()}\nError: ${err.message}`, {
                dismissable: true
            });
        })
    }

    async refreshAPIVersions() {
        this.connection.versions = await RestAPI.getApiVersions(this.connection.host);
        return this.save();
    }

    async refreshFromServer() {
        try {
            const { files, zip } = await MetadataAPI.retrieve(this);
            this.metadata = files;
            this.save();

            await Promise.all(Object.entries(zip.files).map(async ([dir, zipObj]) => {
                const data = await zipObj.async("string");
                return this.srcFolder.getFile(dir).write(data);
            }));
            atom.notifications.addSuccess("Successfully refreshed from server.");
        } catch (ex) {
            atom.notifications.addError(`Failed to refresh from server.\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }

    // Prompts the user to authenticate. Simply never returns if the user opts not to authenticate.
    async authenticate(type) {
        const result = await new Promise(accept => {
            atom.workspace.open("plasma://authenticate", {
                type: type,
                username: this.connection.username,
                callback: accept
            });
        });

        if (result.error === "access_denied") {
            atom.notifications.addWarning("Credentials not updated.");
            return;
        }

        const host = new URL(result.instance_url).host;
        const [userInfo, versions] = await Promise.all([
            RestAPI.getUserInfo(result.id, result.token_type + " " + result.access_token),
            RestAPI.getApiVersions(host)
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
        this.connection.issuedat = +result.issued_at;
        this.connection.expiresin = +result.expires_in;

        if (!this.isNew) {
            await this.save();
        }

        keytar.setPassword("plasma-salesforce", result.id, result.access_token);
        keytar.setPassword("plasma-salesforce-refresh", result.id, result.refresh_token);
        atom.notifications.addSuccess(`Credentials for ${this.connection.username} successfully updated.`);
        this.emit("authenticate");
    }

    async reauthenticate() {
        const refreshKey = keytar.getPassword("plasma-salesforce-refresh", this.connection.id);
        const host = this.connection.type === "Sandbox" ? "test.salesforce.com" : "login.salesforce.com";
        const result = await RestAPI.refreshToken(host, await refreshKey);

        this.connection.baseurl = result.instance_url;
        this.connection.host = new URL(result.instance_url).host;
        this.connection.token_type = result.token_type;
        this.connection.id = result.id;
        this.connection.issuedat = +result.issued_at;

        this.save();
        await keytar.setPassword("plasma-salesforce", this.connection.id, result.access_token);
        return result.access_token;
    }

    async getToken() {
            return keytar.getPassword("plasma-salesforce", this.connection.id);
    }

    async getOauth() {
        return this.connection.token_type + " " + await this.getToken();
    }
}
