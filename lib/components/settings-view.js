"use babel"; /** @jsx etch.dom */

import etch from "etch";

export default class SettingsView {
    constructor(model) {
        this.model = model;
        this.model.project.on("update", this.onUpdate);
        this.model.project.on("load", this.onLoad);
        this.model.project.on("authenticate", this.onAuthenticate);

        this.path = this.model.project.root ? this.model.project.root.getPath() : "";
        this.type = this.model.project.connection.type;
        this.api = this.model.project.connection.api;

        etch.initialize(this);
    }

    onUpdate = () => {
        this.path = this.model.project.isNew ? this.refs.form.path.value : (this.model.project.root ? this.model.project.root.getPath() : "");
        this.type = this.refs.form.type.value;
        this.api = this.refs.form.api.value;
        etch.update(this);
    }

    onLoad = () => {
        this.path = this.model.project.root ? this.model.project.root.getPath() : "";
        this.type = this.model.project.connection.type;
        this.api = this.model.project.connection.api;
        etch.update(this);
    }

    onAuthenticate = () => {
        this.path = this.model.project.isNew ? this.refs.form.path.value : this.model.project.root ? this.model.project.root.getPath() : "";
        this.type = this.model.project.connection.type;
        this.api = this.model.project.connection.api;
        etch.update(this);
    }

    async doAuthenticate() {
        return this.model.authenticate(this.refs.form.type.value);
    }

    async doUpdateAPI() {
        return this.model.getAPIVersions();
    }

    async doSave() {
        this.refs.save.textContent = "Save Settings";
        return this.model.save(this.refs.form.api.value, this.refs.form.path.value);
    }



    async update() {
        etch.update(this);
    }

    async destroy() {
        this.model.project.removeListener("update", this.onUpdate);
        this.model.project.removeListener("load", this.onLoad);
        this.model.project.removeListener("authenticate", this.onAuthenticate);
        return etch.destroy(this);
    }

    render() {
        return (
        <div class="plasma-settings native-key-bindings">
            <div class="panel">
                <form ref="form">
                    <h1>Project Settings</h1>

                    <h2>Project Path</h2>
                    <div class="text-subtle setting-description">Path to the root directory for this SalesForce project. This folder will contain a "src" folder.</div>
                    <input type="text" name="path" value={this.path} required="true" readOnly={!this.model.project.isNew} placeholder="path/to/project" class="input-text" on={{change: this.onPathUpdate, keyup: this.onPathUpdate}} />

                    <h1>Salesforce Settings</h1>

                    <h2>User Name</h2>
                    <div class="text-subtle setting-description">The UserName for this organization. This is read only. To update the user name, see Authentication below.</div>
                    <input type="text" value={this.model.project.connection.username} readOnly="true" disabled="true" placeholder="Please Authenticate" class="input-text" />

                    <h2>Authentication</h2>
                    <div class="text-subtle setting-description">Select an organization type and click Authenticate to log in or update credentials.</div>
                    <div class="input-and-button">
                        <select name="type" value={this.model.project.connection.type} class="input-select org-type-select">
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
                    <button ref="save" class="btn btn-lg full-width" disabled={!this.model.project.connection.authenticated || !this.path} on={{click: this.doSave}}>{this.model.project.isNew ? "Create Project" : "Save Settings"}</button>
                </form>
            </div>
        </div>
        );
    }

    onPathUpdate() {
        // Only captured to hide and show save button.
        this.refs.save.disabled = !this.model.project.connection.authenticated || !this.refs.form.path.value;
    }
}
