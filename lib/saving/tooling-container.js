"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tooling_save_1 = tslib_1.__importDefault(require("./tooling-save"));
const file_info_1 = tslib_1.__importDefault(require("./file-info"));
const query_1 = tslib_1.__importDefault(require("api/tooling/query"));
const soap_helpers_1 = require("api/soap-helpers");
const crud_sobject_1 = tslib_1.__importDefault(require("api/tooling/crud-sobject"));
const helpers_1 = require("helpers");
const FOLDER_TO_TYPE = {
    "classes": "ApexClass",
    "triggers": "ApexTrigger",
    "pages": "ApexPage",
    "components": "ApexComponent"
};
class ToolingContainerSave extends tooling_save_1.default {
    constructor(project, entity, savedFiles, bodyField) {
        super(project, entity);
        this.bodyField = bodyField;
        this.type = FOLDER_TO_TYPE[this.folder];
        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.isMetadata) || new file_info_1.default(this.project, this.entity);
        this.metadata = savedFiles.find(file => file.isMetadata) || new file_info_1.default(this.project, this.entity + "-meta.xml");
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new query_1.default(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, ${this.bodyField}
            FROM ${this.type}
            WHERE ${whereClause}
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleQueryResult() {
        const queryResult = this.query.result;
        if (queryResult && queryResult.length) {
            this.memberId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0][this.bodyField],
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        }
        else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }
    async getSaveRequests(containerName) {
        const requestBody = {
            Body: await this.source.read(),
            MetadataContainerId: `@{${containerName}.id}`
        };
        if (this.memberId) {
            requestBody.ContentEntityId = this.memberId;
        }
        else {
            requestBody.FullName = this.name;
        }
        if (!await this.metadata.exists()) {
            await this.metadata.write(this.getDefaultMetadata());
            requestBody.Metadata = {
                apiVersion: this.project.apiVersion,
                status: "Active"
            };
        }
        else {
            const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
            requestBody.Metadata = {
                apiVersion: soap_helpers_1.getText(metadataFile, "//met:apiVersion/text()"),
                status: soap_helpers_1.getText(metadataFile, "//met:status/text()")
            };
        }
        return [new crud_sobject_1.default({
                sobject: this.type + "Member",
                method: "POST",
                body: requestBody
            })];
    }
    async handleSaveResult(results) {
        if (results.length == 0) {
            this.errorMessage = "Unable to find save results. Try cleaning the project.";
            return;
        }
        const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === this.project.srcFolder.getFile(this.source.path).getPath());
        helpers_1.clearMarkers(editors);
        if (results.length == 1 && results[0].success) {
            return;
        }
        const errors = [];
        for (const result of results) {
            const prefix = result.lineNumber ? result.lineNumber.toString() + ": " : "";
            const message = result.problem.replace(/\n/g, "\n" + "".padStart(prefix.length, " "));
            errors.push(prefix + message);
            if (result.lineNumber) {
                helpers_1.addErrorMarker(editors, result.lineNumber - 1);
            }
        }
        this.errorMessage = errors.filter(error => error).join("\n\n");
    }
}
exports.default = ToolingContainerSave;
