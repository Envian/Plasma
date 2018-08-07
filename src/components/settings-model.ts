import { Directory } from "atom";
import { EventEmitter } from "events";

import Project from "../project.js";
import { authorize, ServerType } from "./auth-view.js";
import { tryLoadProject } from "../project-manager.js";

export default class SettingsModel extends EventEmitter {
    public path: string;
    public project?: Project;

    constructor(state?: string | Project) {
        super();
        // TODO: Figure out why this is required and what we can do about it.
        this.off = this.removeListener;

        if (state instanceof Project) {
            this.project = state;
            this.path = this.project.root.getPath();
        } else {
            this.path = state || "";

            // If a path is provided, try loading the project.
            // In theory, this should happen faster than a user can do something meaningful in the UI.
            tryLoadProject(new Directory(this.path))
                .then((project?: Project) => {
                    if (project) {
                        this.project = project;
                        this.path = this.project.root.getPath();
                        this.emit("reload");
                    } else {
                        throw Error("Project not found: " + state);
                    }
                });
        }
    }

    async authenticate(type: ServerType): Promise<void> {
        if (!this.project) throw Error("Project is not loaded");
        this.project.handleAuthResult(await authorize(type, this.project.connection.username), type);
    }

    async refreshAPIVersions(): Promise<void> {
        if (!this.project) throw Error("Project is not loaded");

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

    async save(api: string) {
        if (!this.project) throw Error("Project is not loaded");

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
        if (!this.project) return null;

        return {
            deserializer: "SettingsModel",
            data: this.project.root.getPath()
        };
    }

    getTitle(): string {
        return "Plasma Settings";
    }

    destroy(): void {
        //this.view.destroy();
    }
}
