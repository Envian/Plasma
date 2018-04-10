"use babel";

import { Directory } from "atom";

import Project from "../project.js";

export default class SettingsModel {
    constructor(state) {
        if (typeof(state) === "string" && state) {
            this.project = new Project(new Directory(state));
            this.project.load();
        } else if (state instanceof Project) {
            this.project = state;
        } else {
            this.project = new Project();
        }
    }

    async authenticate(type) {
        return this.project.authenticate(type).then(() => {
            atom.notifications.addSuccess("Successfully authenticated.");
        }).catch(err => {
            atom.notifications.addError("Failed to authenticate.", {
                dismissable: true,
                detail: err.stack
            });
        });
    }

    async getAPIVersions() {
        return this.project.refreshAPIVersions().then(() => {
            atom.notifications.addSuccess("API versions successfully updated.");
        }).catch(err => {
            atom.notifications.addError("Failed to update API versions.", {
                dismissable: true,
                detail: err.stack
            });
        });
    }

    async save(api, path) {
        this.project.connection.api = api;
        this.project.root = new Directory(path);

        return this.project.save().then(() => {
            atom.notifications.addSuccess("Project information has been updated.");
        }).catch(err => {
            atom.notifications.addError("Failed to save project.", {
                dismissable: true,
                detail: err.stack
            });
        });
    }



    serialize() {
        if (this.project.isNew) {
            return null;
        } else {
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
        //this.view.destroy();
    }
}
