"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";
import { getText } from "../api/soap-helpers.js";
import { mapby } from "../helpers.js";

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
                Object.assign(file, EXTENSION_TO_DATA[file.path.substr(file.path.lastIndexOf(".") + 1)]);
            }
        }

        this.metadata = savedFiles.find(file => file.type === "_METADATA");
    }

    getConflictQuery() {
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
            if (file.type !== "_METADATA") {
                const serverFile = queryResults[file.type];
                const state = this.project.metadata[file.path];
                if (serverFile) {
                    return this.handleConflictWithServer({
                        modifiedBy: serverFile.LastModifiedBy.Name,
                        modifiedDate: serverFile.LastModifiedDate,
                        id: serverFile.Id,
                        type: "AuraDefinition",
                        body: serverFile.Source,
                        state: state,
                        path: file.path,
                        name: file.path.substr(file.path.lastIndexOf("/") + 1)
                    });
                } else {
                    return this.handleConflictsWithoutServer(state);
                }
            }
        }
    }

    async prepareSave() {
        const queryResults = await this.query.result;
        this.bundleId = queryResults.length && queryResults[0].AuraDefinitionBundleId;
        console.log(this.bundleId, queryResults);
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                this.metadata.attributes = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    description: getText(metadataFile, "//met:description/text()")
                };
            } else {
                this.metadata.attributes = {
                    apiVersion: this.project.apiVersion,
                    description: this.name
                };
                await this.project.srcFolder.getFile(this.metadata.path)
                    .write(getDefaultMetadata(this.project.apiVersion, this.type));
            }
        }
    }

    getSaveRequest(containerId) {
        const saveRequests = [];
        if (this.metadata) {
            this.metadata.saveRequest = new ToolingAPI.CRUDRequest({
                sobject: "AuraDefinitionBundle",
                method: this.bundleId ? "PATCH" : "POST",
                id: this.bundleId,
                body: this.metadata.attributes,
                referenceId: this.name + "_bundleId"
            });
            saveRequests.push(this.metadata.saveRequest);
        }

        console.log(this.files);

        return saveRequests.concat(this.files.map(file => {
            if (file.type === "_METADATA") return;

            const state = this.project.metadata[file.path];
            file.saveRequest = new ToolingAPI.CRUDRequest({
                sobject: "AuraDefinition",
                method: state ? "PATCH" : "POST",
                id: state && state.id,
                body: {
                    Source: file.body,
                    DefType: this.type,
                    Format: this.format,
                    AuraDefinitionBundleId: this.metadata ? undefined : `@{${this.name}_bundleId.Id}`
                }
            });
            return file.saveRequest;
        })).filter(item => item);
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

function getDefaultMetadata(version, description) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${apiVersion}</apiVersion>
    <desciption>${description}</description>
</AuraDefinitionBundle>`;
}
