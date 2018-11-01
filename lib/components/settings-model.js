"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_1 = require("atom");
const events_1 = require("events");
const project_js_1 = tslib_1.__importDefault(require("../project.js"));
const auth_view_js_1 = require("./auth-view.js");
const project_manager_js_1 = require("../project-manager.js");
class SettingsModel extends events_1.EventEmitter {
    constructor(state) {
        super();
        this.off = this.removeListener;
        if (state instanceof project_js_1.default) {
            this.project = state;
            this.path = this.project.root.getPath();
        }
        else {
            this.path = state || "";
            project_manager_js_1.tryLoadProject(new atom_1.Directory(this.path))
                .then((project) => {
                if (project) {
                    this.project = project;
                    this.path = this.project.root.getPath();
                    this.emit("reload");
                }
                else {
                    throw Error("Project not found: " + state);
                }
            });
        }
    }
    async authenticate(type) {
        if (!this.project)
            throw Error("Project is not loaded");
        this.project.handleAuthResult(await auth_view_js_1.authorize(type, this.project.connection.username), type);
    }
    async refreshAPIVersions() {
        if (!this.project)
            throw Error("Project is not loaded");
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
    async save(api) {
        if (!this.project)
            throw Error("Project is not loaded");
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
        if (!this.project)
            return null;
        return {
            deserializer: "SettingsModel",
            data: this.project.root.getPath()
        };
    }
    getTitle() {
        return "Plasma Settings";
    }
    destroy() {
    }
}
exports.default = SettingsModel;
