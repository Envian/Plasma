"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const query_js_1 = tslib_1.__importDefault(require("../api/tooling/query.js"));
const crud_sobject_js_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject.js"));
const tooling_save_js_1 = tslib_1.__importDefault(require("./tooling-save.js"));
const soap_helpers_js_1 = require("../api/soap-helpers.js");
const file_info_js_1 = tslib_1.__importDefault(require("./file-info.js"));
class VisualforceSave extends tooling_save_js_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles);
        this.type = this.folder === "pages" ? "ApexPage" : "ApexComponent";
        this.path = entity + ".cls";
        this.state = project.files[this.path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));
        if (!this.source) {
            this.source = new file_info_js_1.default(project, this.path);
            savedFiles.push(this.source);
        }
        if (!this.state && !this.metadata) {
            this.metadata = new file_info_js_1.default(project, this.path + "-meta.xml");
        }
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new query_js_1.default(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Markup
            FROM ${this.type}
            WHERE ${whereClause}
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleConflicts() {
        const queryResult = this.query.getResult();
        if (queryResult.length) {
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0].Markup,
                localState: this.state,
                path: this.path,
                name: this.name
            });
        }
        else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }
    async getSaveRequest(containerId) {
        let attributes;
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                attributes = {
                    apiVersion: soap_helpers_js_1.getText(metadataFile, "//met:apiVersion/text()"),
                    label: soap_helpers_js_1.getText(metadataFile, "//met:label/text()")
                };
            }
            else {
                attributes = {
                    apiVersion: this.project.apiVersion,
                    label: this.name
                };
                await this.metadata.write(getDefaultMetadata(this.project.apiVersion, this.name, this.type));
            }
        }
        return [new crud_sobject_js_1.default({
                sobject: this.type + "Member",
                method: "POST",
                body: {
                    Body: await this.source.read(),
                    ContentEntityId: this.state && this.state.id,
                    FullName: (this.state && this.state.id) ? undefined : this.name,
                    MetadataContainerId: `@{${containerId}.id}`,
                    Metadata: attributes
                }
            })];
    }
    async handleErrorMessages(results) {
        return "oh noes";
    }
    async handleSaveResult(results) {
    }
}
exports.default = VisualforceSave;
function getDefaultMetadata(version, label, type) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <label>${label}</label>
</${type}>`;
}
