"use babel";

import { Directory } from "atom";

import Project, { ConnectionInfo } from "../project.js";
import { AuthorizationResult, authorize, ServerType } from "./auth-view.js";

export default class SettingsModel {
    public connection: ConnectionInfo;
    public project?: Project;
    private authResult?: AuthorizationResult;

    constructor(state?: string | Project) {
        if (typeof(state) === "string" && state) {
            this.project = new Project(new Directory(state));
            this.project.load();
            this.connection = this.project.connection;
        } else if (state instanceof Project) {
            this.project = state;
            this.connection = this.project.connection;
        } else {
            this.connection = new ConnectionInfo();
        }
    }

    async authenticate(type: ServerType): Promise<void> {
        const result = await authorize(type, this.connection.username);
        if (this.project) {
            this.project.handleAuthResult(result, type);
        } else {
            this.authResult = result;
        }
    }

    async getAPIVersions(): Promise<void> {
        if (!this.project) return;

        try {
            await this.project.refreshAPIVersions();
            atom.notifications.addSuccess("API versions successfully updated.");
        } catch (ex) {
            atom.notifications.addError("Failed to update API versions.", {
                dismissable: true,
                detail: ex.stack
            });
        }
    }

    async save(api: string, path: string) {
        if (!this.project) {
            this.project = new Project(new Directory(path));
            this.project.connection = Object.assign({}, this.connection);
            if (this.authResult) {
                await this.project.handleAuthResult(this.authResult, this.connection.type);
            }
        }
        this.project.connection.api = api;
        try {
            await this.project.save();
            atom.notifications.addSuccess("Project information has been updated.");
        } catch (ex) {
            atom.notifications.addError("Failed to save project.", {
                dismissable: true,
                detail: ex.stack
            });
        }
    }


    // TODO: Figure out better typing here.
    serialize(): any {
        if (!this.project) {
            // Don't restore this window if the project has not been saved.
            return null;
        } else {
            return {
                deserializer: "SettingsModel",
                data: this.project.root.getPath()
            };
        }
    }

    getTitle(): string {
        return "Plasma Settings";
    }

    destroy(): void {
        //this.view.destroy();
    }
}
