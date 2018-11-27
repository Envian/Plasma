"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const keytar_1 = require("keytar");
const events_1 = require("events");
const atom_1 = require("atom");
const fs_1 = require("fs");
const project_manager_js_1 = require("./project-manager.js");
const auth_view_js_1 = require("./components/auth-view.js");
const login_js_1 = require("./api/rest/login.js");
const api_versions_js_1 = tslib_1.__importDefault(require("./api/rest/api-versions.js"));
const user_info_js_1 = tslib_1.__importDefault(require("./api/rest/user-info.js"));
const retrieve_js_1 = tslib_1.__importDefault(require("./api/metadata/retrieve.js"));
const helpers_js_1 = require("./helpers.js");
class Project extends events_1.EventEmitter {
    constructor(root) {
        super();
        this.findProjectForFile = project_manager_js_1.findProjectForFile;
        this.findProjectForDirectory = project_manager_js_1.findProjectForDirectory;
        this.getProjectForFilesAndDirs = project_manager_js_1.getProjectForFilesAndDirs;
        this.root = root;
        this.srcFolder = root.getSubdirectory("src");
        this.packageXml = this.srcFolder.getFile("package.xml");
        this.configFile = root.getSubdirectory("config").getFile("plasma.json");
        this.loading = false;
        this._loaded = false;
        this._files = {};
        this.connection = new ConnectionInfo();
        project_manager_js_1.register(this);
    }
    get apiVersion() {
        return this.connection.api || this.connection.versions && this.connection.versions[0];
    }
    get loaded() {
        return this._loaded;
    }
    get files() {
        return this._files;
    }
    async save() {
        try {
            await this.configFile.create();
            await this.srcFolder.create();
            await this.configFile.write(JSON.stringify({
                connection: this.connection,
                files: this.files
            }, null, 4));
            this._loaded = true;
            this.emit("save", this);
        }
        catch (ex) {
            atom.notifications.addError(`Failed to save project.\nDirectory: ${this.root.getPath()}\nError: ${ex.message}`, {
                dismissable: true,
                detail: ex.stack
            });
        }
    }
    async load() {
        if (this.loaded || this.loading)
            return;
        this.loading = true;
        try {
            const saveFile = await this.configFile.read();
            if (!saveFile) {
                this.loading = false;
                return;
            }
            const saveData = JSON.parse(saveFile);
            Object.assign(this.connection, saveData.connection);
            Object.assign(this.files, saveData.files);
            this._loaded = true;
            this.loading = false;
            this.emit("load", this);
        }
        catch (ex) {
            this.loading = false;
            atom.notifications.addError(`Failed to load project.\nDirectory: ${this.root.getPath()}\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }
    async refreshAPIVersions() {
        this.connection.versions = await api_versions_js_1.default(this.connection.host);
        return this.save();
    }
    async refreshFromServer() {
        try {
            const { files, zip } = await retrieve_js_1.default(this);
            this._files = files;
            const savePromise = this.save();
            await Promise.all(Object.entries(zip.files).map(async ([dir, zipObj]) => {
                const data = await zipObj.async("string");
                return this.srcFolder.getFile(dir).write(data);
            }));
            await savePromise;
            atom.notifications.addSuccess("Successfully refreshed from server.");
        }
        catch (ex) {
            atom.notifications.addError(`Failed to refresh from server.\nError: ${ex.message}`, {
                dismissable: true
            });
        }
    }
    async cleanProject() {
        await this.refreshFromServer();
        const newFiles = new Set(Object.keys(this.files).map(file => new atom_1.File(file).getPath().toLowerCase()));
        const localFiles = await helpers_js_1.getEntriesRecusively(this.srcFolder);
        const filesToDelete = localFiles.filter(file => file.isFile()).filter(file => {
            const path = file.getPath();
            const correctedPath = path.endsWith("-meta.xml") ? path.substr(0, path.lastIndexOf("-meta.xml")) : path;
            return !newFiles.has(this.srcFolder.relativize(correctedPath).toLowerCase());
        });
        await Promise.all(filesToDelete.map(file => {
            return new Promise(resolve => {
                fs_1.unlink(file.getPath(), resolve);
            });
        }));
        await Promise.all(localFiles.filter(dir => dir.isDirectory()).map(async (dir) => {
            if (!(await helpers_js_1.getEntries(dir)).length) {
                await new Promise((resolve, reject) => {
                    fs_1.rmdir(dir.getPath(), (error) => {
                        if (error)
                            reject(error);
                        resolve();
                    });
                });
            }
        }));
    }
    async authenticate(type) {
        const result = await auth_view_js_1.authorize(type, this.connection.username);
        return this.handleAuthResult(result, type);
    }
    async handleAuthResult(result, type, connectionInfo) {
        if (result.error === "access_denied") {
            atom.notifications.addWarning("Credentials not updated.");
            return;
        }
        const host = new URL(result.instance_url).host;
        const [userInfo, versions] = await Promise.all(connectionInfo || [
            user_info_js_1.default(result.id, result.token_type + " " + result.access_token),
            api_versions_js_1.default(host)
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
        await this.save();
        keytar_1.setPassword("plasma-salesforce", result.id, result.access_token);
        keytar_1.setPassword("plasma-salesforce-refresh", result.id, result.refresh_token);
        atom.notifications.addSuccess(`Credentials for ${this.connection.username} successfully updated.`);
        this.emit("authenticate", this);
    }
    async reauthenticate() {
        const refreshKey = keytar_1.getPassword("plasma-salesforce-refresh", this.connection.id);
        const host = this.connection.type === "Sandbox" ? "test.salesforce.com" : "login.salesforce.com";
        const result = await login_js_1.refreshToken(host, await refreshKey);
        this.connection.baseurl = result.instance_url;
        this.connection.host = new URL(result.instance_url).host;
        this.connection.token_type = result.token_type;
        this.connection.id = result.id;
        this.save();
        await keytar_1.setPassword("plasma-salesforce", this.connection.id, result.access_token);
        return result.access_token;
    }
    async getToken() {
        return keytar_1.getPassword("plasma-salesforce", this.connection.id);
    }
    async getOauth() {
        return this.connection.token_type + " " + await this.getToken();
    }
}
exports.default = Project;
class ConnectionInfo {
    constructor() {
        this.authenticated = false;
        this.type = auth_view_js_1.ServerType.Sandbox;
        this.api = "";
        this.versions = [];
        this.username = "";
        this.userid = "";
        this.baseurl = "";
        this.host = "";
        this.token_type = "";
        this.id = "";
    }
}
exports.ConnectionInfo = ConnectionInfo;
