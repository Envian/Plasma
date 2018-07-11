"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_1 = require("atom");
const project_js_1 = tslib_1.__importStar(require("../project.js"));
const auth_view_js_1 = require("./auth-view.js");
class SettingsModel {
    constructor(state) {
        if (typeof (state) === "string" && state) {
            this.project = new project_js_1.default(new atom_1.Directory(state));
            this.project.load();
            this.connection = this.project.connection;
        }
        else if (state instanceof project_js_1.default) {
            this.project = state;
            this.connection = this.project.connection;
        }
        else {
            this.connection = new project_js_1.ConnectionInfo();
        }
    }
    async authenticate(type) {
        const result = await auth_view_js_1.authorize(type, this.connection.username);
        if (this.project) {
            this.project.handleAuthResult(result, type);
        }
        else {
            this.authResult = result;
        }
    }
    async getAPIVersions() {
        if (!this.project)
            return;
        try {
            await this.project.refreshAPIVersions();
            atom.notifications.addSuccess("API versions successfully updated.");
        }
        catch (ex) {
            atom.notifications.addError("Failed to update API versions.", {
                dismissable: true,
                detail: ex.stack
            });
        }
    }
    async save(api, path) {
        if (!this.project) {
            this.project = new project_js_1.default(new atom_1.Directory(path));
            this.project.connection = Object.assign({}, this.connection);
            if (this.authResult) {
                await this.project.handleAuthResult(this.authResult, this.connection.type);
            }
        }
        this.project.connection.api = api;
        try {
            await this.project.save();
            atom.notifications.addSuccess("Project information has been updated.");
        }
        catch (ex) {
            atom.notifications.addError("Failed to save project.", {
                dismissable: true,
                detail: ex.stack
            });
        }
    }
    serialize() {
        if (!this.project) {
            return null;
        }
        else {
            return {
                deserializer: "SettingsModel",
                data: this.project.root.getPath()
            };
        }
    }
    getTitle() {
        return "Plasma Settings";
    }
    destroy() {
    }
}
exports.default = SettingsModel;
