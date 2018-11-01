"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const etch_1 = tslib_1.__importDefault(require("etch"));
const auth_view_js_1 = require("./auth-view.js");
class SettingsView {
    constructor(model) {
        this.model = model;
        if (this.model.project) {
            this.type = this.model.project.connection.type;
            this.api = this.model.project.connection.api;
            this.model.project.on("save", (project) => this.onSave(project));
            this.model.project.on("load", (project) => this.onLoad(project));
            this.model.project.on("authenticate", (project) => this.onAuthenticate(project));
            etch_1.default.update(this);
        }
        else {
            this.api = "";
            this.type = auth_view_js_1.ServerType.Production;
            this.model.on("reload", () => {
                if (this.model.project) {
                    this.type = this.model.project.connection.type;
                    this.api = this.model.project.connection.api;
                    this.model.project.on("save", (project) => this.onSave(project));
                    this.model.project.on("load", (project) => this.onLoad(project));
                    this.model.project.on("authenticate", (project) => this.onAuthenticate(project));
                    etch_1.default.update(this);
                }
            });
        }
        etch_1.default.initialize(this);
    }
    onSave(project) {
        this.type = this.refs.form.type.value;
        this.api = this.refs.form.api.value;
        etch_1.default.update(this);
    }
    onLoad(project) {
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch_1.default.update(this);
    }
    onAuthenticate(project) {
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch_1.default.update(this);
    }
    async update() {
        etch_1.default.update(this);
    }
    async destroy() {
        if (this.model.project) {
            this.model.project.removeListener("update", this.onSave);
            this.model.project.removeListener("load", this.onLoad);
            this.model.project.removeListener("authenticate", this.onAuthenticate);
        }
        return etch_1.default.destroy(this);
    }
    render() {
        if (!this.model.project)
            return (etch_1.default.dom("div", null, "Loading..."));
        return (etch_1.default.dom("div", { class: "plasma-settings native-key-bindings" },
            etch_1.default.dom("div", { class: "panel" },
                etch_1.default.dom("form", { ref: "form" },
                    etch_1.default.dom("h1", null, "Project Settings"),
                    etch_1.default.dom("h2", null, "Project Path"),
                    etch_1.default.dom("div", { class: "text-subtle setting-description" }, "Path to the root directory for this SalesForce project. This folder will contain a \"src\" folder."),
                    etch_1.default.dom("input", { type: "text", name: "path", value: this.model.path, required: "true", readOnly: "true", class: "input-text" }),
                    etch_1.default.dom("h1", null, "Salesforce Settings"),
                    etch_1.default.dom("h2", null, "User Name"),
                    etch_1.default.dom("div", { class: "text-subtle setting-description" }, "The UserName for this organization. This is read only. To update the user name, see Authentication below."),
                    etch_1.default.dom("input", { type: "text", value: this.model.project.connection.username, readOnly: "true", disabled: "true", placeholder: "Please Authenticate", class: "input-text" }),
                    etch_1.default.dom("h2", null, "Authentication"),
                    etch_1.default.dom("div", { class: "text-subtle setting-description" }, "Select an organization type and click Authenticate to log in or update credentials."),
                    etch_1.default.dom("div", { class: "input-and-button" },
                        etch_1.default.dom("select", { name: "type", value: this.type, class: "input-select org-type-select" },
                            etch_1.default.dom("option", { value: "Sandbox" }, "Sandbox"),
                            etch_1.default.dom("option", { value: "Production" }, "Production"),
                            etch_1.default.dom("option", { value: "Developer" }, "Developer"),
                            etch_1.default.dom("option", { value: "Preview" }, "Preview")),
                        etch_1.default.dom("button", { class: "btn btn-primary icon icon-cloud-download", on: { click: this.doAuthenticate } }, "Authenticate")),
                    etch_1.default.dom("h2", null, "API"),
                    etch_1.default.dom("div", { class: "text-subtle setting-description" }, "Select the API version to use while connecting to Salesforce. Must be authenticated to chose a specific version."),
                    etch_1.default.dom("div", { class: "input-and-button" },
                        etch_1.default.dom("select", { name: "api", value: this.api, class: "input-select full-width" },
                            etch_1.default.dom("option", { value: "" }, "Latest"),
                            this.model.project.connection.versions.map(version => {
                                return etch_1.default.dom("option", { value: version }, version);
                            })),
                        etch_1.default.dom("button", { ref: "refreshApi", class: "btn icon icon-repo-sync", disabled: !this.model.project.connection.authenticated, on: { click: this.doUpdateAPI } }, "Refresh API Versions")),
                    etch_1.default.dom("hr", null),
                    etch_1.default.dom("button", { ref: "save", class: "btn btn-lg full-width", on: { click: this.doSave } }, this.model.project ? "Save Settings" : "Create Project")))));
    }
    async doAuthenticate() {
        return this.model.authenticate(this.refs.form.type.value);
    }
    async doUpdateAPI() {
        return this.model.refreshAPIVersions();
    }
    async doSave() {
        await this.model.save(this.refs.form.api.value);
    }
}
exports.default = SettingsView;
