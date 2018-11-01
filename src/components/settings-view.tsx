import etch from "etch";
import Project from "../project.js";
import SettingsModel from "./settings-model.js";
import { ServerType } from "./auth-view.js";

// JSX.Element and JSX.IntrinsicElements need to exist.
declare global {
    namespace JSX {
        interface Element { }
        interface IntrinsicElements { [key:string]: any }
    }
}
export default class SettingsView {
    private model: SettingsModel;
    private api: string;
    private type: ServerType;

    // Etch Types
    private refs: any;
    public readonly element?: HTMLElement;

    constructor(model: SettingsModel) {
        this.model = model;

        if (this.model.project) {
            this.type = this.model.project.connection.type;
            this.api = this.model.project.connection.api;
            this.model.project.on("save", (project) => this.onSave(project));
            this.model.project.on("load", (project) => this.onLoad(project));
            this.model.project.on("authenticate", (project) => this.onAuthenticate(project));
            etch.update(this);
        } else {
            this.api = "";
            this.type = ServerType.Production;

            // Called when the project is loaded after this page is constructed.
            this.model.on("reload", () => {
                if (this.model.project) {
                    this.type = this.model.project.connection.type;
                    this.api = this.model.project.connection.api;
                    this.model.project.on("save", (project) => this.onSave(project));
                    this.model.project.on("load", (project) => this.onLoad(project));
                    this.model.project.on("authenticate", (project) => this.onAuthenticate(project));
                    etch.update(this);
                }
            });
        }

        etch.initialize(this);
    }

    // Fires when the project is saved.
    onSave(project: Project): void {
        this.type = this.refs.form.type.value;
        this.api = this.refs.form.api.value;
        etch.update(this);
    }

    // Fires when the project finishes loading.
    onLoad(project: Project): void {
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch.update(this);
    }

    onAuthenticate(project: Project): void {
        this.type = project.connection.type;
        this.api = project.connection.api;
        etch.update(this);
    }

    async update(): Promise<void> {
        etch.update(this);
    }

    async destroy(): Promise<void> {
        if (this.model.project) {
            this.model.project.removeListener("update", this.onSave);
            this.model.project.removeListener("load", this.onLoad);
            this.model.project.removeListener("authenticate", this.onAuthenticate);
        }
        return etch.destroy(this);
    }

    render(): JSX.Element {
        if (!this.model.project) return (
            <div>Loading...</div>
        );

        return (
        <div class="plasma-settings native-key-bindings">
            <div class="panel">
                <form ref="form">
                    <h1>Project Settings</h1>

                    <h2>Project Path</h2>
                    <div class="text-subtle setting-description">Path to the root directory for this SalesForce project. This folder will contain a "src" folder.</div>
                    <input type="text" name="path" value={this.model.path} required="true" readOnly="true" class="input-text" />

                    <h1>Salesforce Settings</h1>

                    <h2>User Name</h2>
                    <div class="text-subtle setting-description">The UserName for this organization. This is read only. To update the user name, see Authentication below.</div>
                    <input type="text" value={this.model.project.connection.username} readOnly="true" disabled="true" placeholder="Please Authenticate" class="input-text" />

                    <h2>Authentication</h2>
                    <div class="text-subtle setting-description">Select an organization type and click Authenticate to log in or update credentials.</div>
                    <div class="input-and-button">
                        <select name="type" value={this.type} class="input-select org-type-select">
                            <option value="Sandbox">Sandbox</option>
                            <option value="Production">Production</option>
                            <option value="Developer">Developer</option>
                            <option value="Preview">Preview</option>
                        </select>
                        <button class="btn btn-primary icon icon-cloud-download" on={{click: this.doAuthenticate}}>Authenticate</button>
                    </div>

                    <h2>API</h2>
                    <div class="text-subtle setting-description">Select the API version to use while connecting to Salesforce. Must be authenticated to chose a specific version.</div>
                    <div class="input-and-button">
                        <select name="api" value={this.api} class="input-select full-width">
                            <option value="">Latest</option>
                            {this.model.project.connection.versions.map(version => {
                                return <option value={version}>{version}</option>;
                            })}
                        </select>
                        <button ref="refreshApi" class="btn icon icon-repo-sync" disabled={!this.model.project.connection.authenticated} on={{click: this.doUpdateAPI}}>Refresh API Versions</button>
                    </div>

                    <hr />
                    <button ref="save" class="btn btn-lg full-width" on={{click: this.doSave}}>{this.model.project ? "Save Settings" : "Create Project"}</button>
                </form>
            </div>
        </div>
        );
    }

    async doAuthenticate(): Promise<void> {
        return this.model.authenticate(this.refs.form.type.value);
    }

    async doUpdateAPI(): Promise<void> {
        return this.model.refreshAPIVersions();
    }

    async doSave(): Promise<void> {
        await this.model.save(this.refs.form.api.value);
    }
}
