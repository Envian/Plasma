"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const file_info_1 = tslib_1.__importDefault(require("./file-info"));
const query_1 = tslib_1.__importDefault(require("../api/tooling/query"));
const crud_sobject_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject"));
const helpers_1 = require("../helpers");
const soap_helpers_1 = require("../api/soap-helpers");
const tooling_standalone_1 = tslib_1.__importDefault(require("./tooling-standalone"));
class Aura extends tooling_standalone_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity);
        this.savesByType = {};
        this.files = savedFiles;
        this.metadata = savedFiles.find(file => file.isMetadata);
        this.query = new query_1.default(`
            SELECT Id, DefType, Source, LastModifiedBy.Name, LastModifiedDate, AuraDefinitionBundleId
            FROM AuraDefinition
            WHERE AuraDefinitionBundle.DeveloperName = '${this.name}'
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleQueryResult() {
        const queryList = await this.query.getResult();
        const queryResults = helpers_1.mapby(queryList, record => record.DefType);
        if (queryList.length) {
            this.bundleId = queryList[0].AuraDefinitionBundleId;
        }
        for (const file of this.files) {
            if (!file.isMetadata) {
                const serverFile = queryResults.get(getComponentType(file.path));
                const state = this.project.files[file.path];
                if (serverFile) {
                    await this.handleConflictWithServer({
                        modifiedBy: serverFile.LastModifiedBy.Name,
                        modifiedDate: serverFile.LastModifiedDate,
                        id: serverFile.Id,
                        type: "AuraDefinition",
                        body: serverFile.Source,
                        localState: state,
                        path: file.path,
                        name: file.entity
                    });
                }
                else {
                    await this.handleConflictsMissingFromServer(state);
                }
            }
        }
    }
    async getSaveRequests() {
        const queryResults = await this.query.getResult();
        const saveRequests = [];
        let attributes;
        if (!this.metadata && !queryResults.length) {
            const rootComponent = this.files.find(file => file.path.endsWith("cmp") || file.path.endsWith("app"));
            if (rootComponent) {
                this.metadata = new file_info_1.default(this.project, rootComponent.path + "-meta.xml");
                this.files.push(this.metadata);
                attributes = {
                    developerName: this.name,
                    masterLabel: this.name,
                };
            }
            else {
                this.errorMessage = `${this.entity} is missing a component or app file.`;
                return [];
            }
        }
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                attributes = {
                    apiVersion: soap_helpers_1.getText(metadataFile, "//met:apiVersion/text()"),
                    description: soap_helpers_1.getText(metadataFile, "//met:description/text()"),
                    developerName: attributes && attributes.developerName,
                    masterLabel: attributes && attributes.masterLabel
                };
            }
            else {
                attributes = {
                    apiVersion: this.project.apiVersion,
                    description: this.name,
                    developerName: attributes && attributes.developerName,
                    masterLabel: attributes && attributes.masterLabel
                };
                await this.metadata.write(getAuraDefaultMetadata(this.project.apiVersion, this.name));
            }
            this.savesByType["_METADATA"] = new crud_sobject_1.default({
                sobject: "AuraDefinitionBundle",
                method: this.bundleId ? "PATCH" : "POST",
                id: this.bundleId,
                body: attributes,
                referenceId: this.name + "_bundleId"
            });
            saveRequests.push(this.savesByType["_METADATA"]);
        }
        return saveRequests.concat(this.files.map(file => {
            if (file.isMetadata)
                return;
            const state = this.project.files[file.path];
            const type = getComponentType(file.path);
            const request = new crud_sobject_1.default({
                sobject: "AuraDefinition",
                method: state ? "PATCH" : "POST",
                id: state && state.id,
                body: {
                    Source: file.body,
                    DefType: type,
                    Format: TYPE_TO_FORMAT[type],
                    AuraDefinitionBundleId: this.bundleId ? undefined : `@{${this.name}_bundleId.id}`
                }
            });
            this.savesByType[type] = request;
            return request;
        })).filter(save => save);
    }
    async handleSaveResult() {
        this.errorMessage = this.files.reduce((err, file) => {
            const result = this.savesByType[getComponentType(file.path)].result;
            if (result && !result.success) {
                return err + `${file.path}:\n  ${result[0].message.replace(/\n/g, "\n  ")}`;
            }
            else if (!file.isMetadata) {
                this.project.files[file.path] = Object.assign(this.project.files[file.path] || {}, {
                    lastSyncDate: new Date().toISOString(),
                    type: "AuraDefinitionBundle"
                });
                if (result && result.id) {
                    this.project.files[file.path].id = result.id;
                }
            }
            return err;
        }, "");
    }
}
exports.default = Aura;
function getAuraDefaultMetadata(version, description) {
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
    "CONTROLLER": "JS",
    "HELPER": "JS",
    "RENDERER": "JS",
    "COMPONENT": "XML",
    "STYLE": "CSS",
    "DOCUMENTATION": "XML",
    "DESIGN": "XML",
    "SVG": "XML",
    "APPLICATION": "XML",
    "EVENT": "XML",
    "INTERFACE": "XML",
    "TOKENS": "XML"
};
