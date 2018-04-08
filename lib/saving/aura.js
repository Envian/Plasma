"use babel";

import { mapby } from "../helpers.js";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

const EXTENSION_TO_DATA = {
    "cmp": { type: "COMPONENT", format: "XML" },
    "css": { type: "STYLE", format: "CSS" },
    "auradoc": { type: "DOCUMENTATION", format: "XML" },
    "design": { type: "DESIGN", format: "XML" },
    "svg": { type: "SVG", format: "XML" },
    "app": { type: "APPLICATION", format: "XML" },
    "evt": { type: "EVENT", format: "XML" },
    "intf": { type: "INTERFACE", format: "XML" },
    "tokens": { type: "TOKENS", format: "XML" },
    "xml": { type: "_METADATA" }
};

export default class AuraSave extends ToolingSave {
    constructor(project, path, savedFiles) {
        super(project, path, savedFiles);

        for (const file of savedFiles) {
             if (file.path.endsWith("Controller.js")) {
                file.type = "CONTROLLER";
                file.format = "JS";
            } else if (file.path.endsWith("Helper.js")) {
                file.type = "HELPER";
                file.format = "JS";
            } else if (file.path.endsWith("Renderer.js")) {
                file.type = "RENDERER";
                file.format = "JS";
            } else {
                Object.assign(file, EXTENSION_TO_DATA[file.path.substr(file.path.indexOf(".") + 1)]);
            }
        }

        this.metadata = savedFiles.find(file => file.type === "_METADATA");
    }

    queryForConflicts() {
        this.query = new ToolingAPI.Query(`
            SELECT Id, DefType, Source, LastModifiedBy.Name, LastModifiedDate, AuraDefinitionBundleId
            FROM AuraDefinition
            WHERE AuraDefinitionBundle.DeveloperName = '${this.name}'
        `);
        return this.query;
    }

    async checkConflicts() {
        const queryResults = mapby(await this.query.result, record => record.DefType);
        for (const file of this.files) {
            const serverFile = queryResults[file.type];
            if (serverFile) {
                return this.handleConflictWithServer({
                    modifiedBy: serverFile.LastModifiedBy.Name,
                    modifiedDate: serverFile.LastModifiedDate,
                    id: serverFile.Id,
                    type: "AuraDefinition",
                    body: serverFile.Source,
                    state: this.project.metadata[file.path],
                    path: file.path,
                    name: file.path.substr(file.path.lastIndexOf("/") + 1)
                });
            } else {
                // TODO: Save without server file?
                // Also handles metadata files.
                return this.handleConflictsWithoutServer();
            }
        }
    }

    async getSaveRequest(containerId) {
        return (await Promise.all(this.files.map(async file => {
            if (file.type === "_METADATA") return; // Prevents saving metadata files to server.

            const state = this.project.metadata[file.path];
            // Doesn't fully support POST yet
            file.saveRequest = new ToolingAPI.CRUDRequest({
                sobject: "AuraDefinition",
                method: state ? "PATCH" : "POST",
                id: state && state.id,
                body: {
                    Source: file.body,
                    DefType: this.type,
                    Format: this.format
                }
            });
            return file.saveRequest;
        }))).filter(item => item);
    }

    async handleSaveResult() {
        this.success = true;
        await Promise.all(this.files.filter(file => file.saveRequest).map(async file => {
            file.saveRequest.result.then(result => {
                this.project.metadata[file.path] = Object.assign(this.project.metadata[file.path] || {}, {
                    lastSyncDate: new Date().toISOString(),
                    type: "AuraDefinitionBundle"
                });
                // TODO: handle new files.
            }).catch(error => {
                atom.notifications.addError(`Failed to save ${file.path.substr(file.path.lastIndexOf("/") + 1)}.`, {
                    detail: error,
                    dismissable: true
                });
                this.success = false;
            });
        }));
    }
}
