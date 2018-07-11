"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const etch = require("etch");
const auth_view_js_1 = require("./auth-view.js");
class SettingsView {
    constructor(model) {
        this.model = model;
        if (this.model.project) {
            this.model.project.on("save", this.onSave);
            this.model.project.on("load", this.onLoad);
            this.model.project.on("authenticate", this.onAuthenticate);
            this.path = this.model.project.root.getPath();
            this.api = this.model.project.connection.api;
            this.type = this.model.project.connection.type;
        }
        else {
            this.path = "";
            this.api = "";
            this.type = auth_view_js_1.ServerType.Sandbox;
        }
        etch.initialize(this);
    }
    onSave(project) {
        this.path = project.root.getPath();
        this.type = this.refs.form.type.value;
        this.api = this.refs.form.api.value;
        etch.update(this);
    }
    onLoad(project) {
        this.path = project.root.getPath();
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch.update(this);
    }
    onAuthenticate(project) {
        this.path = project.root.getPath();
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch.update(this);
    }
    async update() {
        etch.update(this);
    }
    async destroy() {
        if (this.model.project) {
            this.model.project.removeListener("update", this.onSave);
            this.model.project.removeListener("load", this.onLoad);
            this.model.project.removeListener("authenticate", this.onAuthenticate);
        }
        return etch.destroy(this);
    }
    render() {
        return (etch.dom("div", { class: "plasma-settings native-key-bindings" },
            etch.dom("div", { class: "panel" },
                etch.dom("form", { ref: "form" },
                    etch.dom("h1", null, "Project Settings"),
                    etch.dom("h2", null, "Project Path"),
                    etch.dom("div", { class: "text-subtle setting-description" }, "Path to the root directory for this SalesForce project. This folder will contain a \"src\" folder."),
                    etch.dom("input", { type: "text", name: "path", value: this.path, required: "true", readOnly: !!this.model.project, placeholder: "path/to/project", class: "input-text", on: { change: this.onPathUpdate, keyup: this.onPathUpdate } }),
                    etch.dom("h1", null, "Salesforce Settings"),
                    etch.dom("h2", null, "User Name"),
                    etch.dom("div", { class: "text-subtle setting-description" }, "The UserName for this organization. This is read only. To update the user name, see Authentication below."),
                    etch.dom("input", { type: "text", value: this.model.connection.username, readOnly: "true", disabled: "true", placeholder: "Please Authenticate", class: "input-text" }),
                    etch.dom("h2", null, "Authentication"),
                    etch.dom("div", { class: "text-subtle setting-description" }, "Select an organization type and click Authenticate to log in or update credentials."),
                    etch.dom("div", { class: "input-and-button" },
                        etch.dom("select", { name: "type", value: this.type, class: "input-select org-type-select" },
                            etch.dom("option", { value: "Sandbox" }, "Sandbox"),
                            etch.dom("option", { value: "Production" }, "Production"),
                            etch.dom("option", { value: "Developer" }, "Developer"),
                            etch.dom("option", { value: "Preview" }, "Preview")),
                        etch.dom("button", { class: "btn btn-primary icon icon-cloud-download", on: { click: this.doAuthenticate } }, "Authenticate")),
                    etch.dom("h2", null, "API"),
                    etch.dom("div", { class: "text-subtle setting-description" }, "Select the API version to use while connecting to Salesforce. Must be authenticated to chose a specific version."),
                    etch.dom("div", { class: "input-and-button" },
                        etch.dom("select", { name: "api", value: this.api, class: "input-select full-width" },
                            etch.dom("option", { value: "" }, "Latest"),
                            this.model.connection.versions.map(version => {
                                return etch.dom("option", { value: version }, version);
                            })),
                        etch.dom("button", { ref: "refreshApi", class: "btn icon icon-repo-sync", disabled: !this.model.connection.authenticated, on: { click: this.doUpdateAPI } }, "Refresh API Versions")),
                    etch.dom("hr", null),
                    etch.dom("button", { ref: "save", class: "btn btn-lg full-width", disabled: !this.model.connection.authenticated || !this.refs.form.path.value, on: { click: this.doSave } }, this.model.project ? "Save Settings" : "Create Project")))));
    }
    async doAuthenticate() {
        return this.model.authenticate(this.refs.form.type.value);
    }
    async doUpdateAPI() {
        return this.model.getAPIVersions();
    }
    async doSave() {
        this.refs.save.textContent = "Save Settings";
        const newProject = !this.model.project;
        await this.model.save(this.refs.form.api.value, this.refs.form.path.value);
        if (newProject && this.model.project) {
            this.model.project.on("save", this.onSave);
            this.model.project.on("load", this.onLoad);
            this.model.project.on("authenticate", this.onAuthenticate);
        }
    }
    onPathUpdate() {
        this.refs.save.disabled = !this.model.connection.authenticated || !this.refs.form.path.value;
    }
}
exports.default = SettingsView;
