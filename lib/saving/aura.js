"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_js_1 = require("../helpers.js");
const query_js_1 = require("../api/tooling/query.js");
const crud_sobject_js_1 = require("../api/tooling/crud-sobject.js");
const tooling_save_js_1 = require("./tooling-save.js");
const soap_helpers_js_1 = require("../api/soap-helpers.js");
class AuraSave extends tooling_save_js_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles);
        this.savesByType = {};
        this.metadata = savedFiles.find(file => file.path.endsWith("xml"));
        this.query = new query_js_1.default(`
            SELECT Id, DefType, Source, LastModifiedBy.Name, LastModifiedDate, AuraDefinitionBundleId
            FROM AuraDefinition
            WHERE AuraDefinitionBundle.DeveloperName = '${this.name}'
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleConflicts() {
        const queryResults = helpers_js_1.mapby(await this.query.getResult(), record => record.DefType);
        for (const file of this.files) {
            if (!file.isMetadata) {
                const serverFile = queryResults.get(getComponentType(file.path));
                const state = this.project.files[file.path];
                if (serverFile) {
                    return this.handleConflictWithServer({
                        modifiedBy: serverFile.LastModifiedBy.Name,
                        modifiedDate: serverFile.LastModifiedDate,
                        id: serverFile.Id,
                        type: "AuraDefinition",
                        body: serverFile.Source,
                        localState: state,
                        path: file.path,
                        name: file.path.substr(file.path.lastIndexOf("/") + 1)
                    });
                }
                else {
                    return this.handleConflictsMissingFromServer(state);
                }
            }
        }
    }
    async getSaveRequest(containerId) {
        const queryResults = await this.query.getResult();
        const bundleId = queryResults.length && queryResults[0].AuraDefinitionBundleId;
        const saveRequests = [];
        let attributes;
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                attributes = {
                    apiVersion: soap_helpers_js_1.getText(metadataFile, "//met:apiVersion/text()"),
                    description: soap_helpers_js_1.getText(metadataFile, "//met:description/text()")
                };
            }
            else {
                attributes = {
                    apiVersion: this.project.apiVersion,
                    description: this.name
                };
                await this.project.srcFolder.getFile(this.metadata.path)
                    .write(getDefaultMetadata(this.project.apiVersion, this.name));
            }
            this.savesByType.metadata = new crud_sobject_js_1.default({
                sobject: "AuraDefinitionBundle",
                method: bundleId ? "PATCH" : "POST",
                id: bundleId,
                body: attributes,
                referenceId: this.name + "_bundleId"
            });
            saveRequests.push(this.savesByType.metadata);
        }
        return saveRequests.concat(this.files.map(file => {
            if (file.isMetadata)
                return;
            const state = this.project.files[file.path];
            const type = getComponentType(file.path);
            const request = new crud_sobject_js_1.default({
                sobject: "AuraDefinition",
                method: state ? "PATCH" : "POST",
                id: state && state.id,
                body: {
                    Source: file.body,
                    DefType: type,
                    Format: TYPE_TO_FORMAT[type],
                    AuraDefinitionBundleId: state ? undefined : `@{${this.name}_bundleId.Id}`
                }
            });
            this.savesByType[type] = request;
            return request;
        }));
    }
    async handleSaveResult(results) {
    }
}
exports.default = AuraSave;
function getDefaultMetadata(version, description) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <desciption>${description}</description>
</AuraDefinitionBundle>`;
}
function getComponentType(path) {
    if (path.endsWith("Controller.js")) {
        return "CONTROLLER";
    }
    else if (path.endsWith("Helper.js")) {
        return "HELPER";
    }
    else if (path.endsWith("Renderer.js")) {
        return "RENDERER";
    }
    else {
        return EXTENSION_TO_TYPE[path.substr(path.lastIndexOf(".") + 1)];
    }
}
const EXTENSION_TO_TYPE = {
    "cmp": "COMPONENT",
    "css": "STYLE",
    "auradoc": "DOCUMENTATION",
    "design": "DESIGN",
    "svg": "SVG",
    "app": "APPLICATION",
    "evt": "EVENT",
    "intf": "INTERFACE",
    "tokens": "TOKENS",
    "xml": "_METADATA"
};
const TYPE_TO_FORMAT = {
    "cmp": "COMPONENT",
    "css": "STYLE",
    "auradoc": "DOCUMENTATION",
    "design": "DESIGN",
    "svg": "SVG",
    "app": "APPLICATION",
    "evt": "EVENT",
    "intf": "INTERFACE",
    "tokens": "TOKENS",
    "xml": "_METADATA"
};
