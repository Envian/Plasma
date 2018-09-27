"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const query_js_1 = tslib_1.__importDefault(require("../api/tooling/query.js"));
const crud_sobject_js_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject.js"));
const soap_helpers_js_1 = require("../api/soap-helpers.js");
const file_info_js_1 = tslib_1.__importDefault(require("./file-info.js"));
const tooling_container_js_1 = tslib_1.__importDefault(require("./tooling-container.js"));
class ApexSave extends tooling_container_js_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles);
        this.type = this.folder === "classes" ? "ApexClass" : "ApexTrigger";
        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.isMetadata);
        this.metadata = savedFiles.find(file => file.isMetadata);
        if (!this.source) {
            this.source = new file_info_js_1.default(project, this.entity);
            savedFiles.push(this.source);
        }
        const whereClause = this.state ? `Id = "${this.state.id}"` : `Name = "${this.name}"`;
        this.query = new query_js_1.default(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
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
            this.classId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0].Body,
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        }
        else {
            this.metadata = this.metadata || new file_info_js_1.default(this.project, this.source.path + "-meta.xml");
            return this.handleConflictsMissingFromServer(this.state);
        }
    }
    async getSaveRequests(containerName) {
        const requestBody = {
            Body: await this.source.read(),
            MetadataContainerId: `@{${containerName}.id}`
        };
        if (this.classId) {
            requestBody.ContentEntityId = this.classId;
        }
        else {
            requestBody.FullName = this.name;
        }
        if (this.metadata) {
            if (!await this.metadata.exists()) {
                await this.metadata.write(getDefaultMetadata(this.project.apiVersion, this.type));
                requestBody.Metadata = {
                    apiVersion: this.project.apiVersion,
                    status: "Active"
                };
            }
            else {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                requestBody.Metadata = {
                    apiVersion: soap_helpers_js_1.getText(metadataFile, "//met:apiVersion/text()"),
                    status: soap_helpers_js_1.getText(metadataFile, "//met:status/text()")
                };
            }
        }
        return [new crud_sobject_js_1.default({
                sobject: this.type + "Member",
                method: this.classId ? "PATCH" : "POST",
                body: requestBody
            })];
    }
    async handleSaveResult(results) {
        if (results.length == 0) {
            this.errorMessage = "Unable to find save results. Try cleaning the project.";
            return;
        }
        const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === this.project.srcFolder.getFile(this.source.path).getPath());
        if (results.length == 1 && results[0].success) {
            clearMarkers(editors);
            return;
        }
        const errors = [];
        for (const result of results) {
            const prefix = result.lineNumber ? result.lineNumber.toString() + ": " : "";
            const message = result.problem.replace(/\n/g, "\n" + "".padStart(prefix.length, " "));
            errors.push(prefix + message);
            addErrorMarker(editors, result.lineNumber - 1);
        }
        this.errorMessage = errors.filter(error => error).join("\n\n");
    }
}
exports.default = ApexSave;
function addErrorMarker(editors, line) {
    if (line == null || !editors || !editors.length)
        return;
    for (const editor of editors) {
        const range = [[line, 0], [line, editor.getBuffer().getLines()[line].length]];
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "touch"
        }), {
            type: "line",
            class: "plasma-error"
        });
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "never"
        }), {
            type: "line-number",
            class: "plasma-error"
        });
    }
}
function clearMarkers(editors) {
    for (const editor of editors) {
        for (const marker of editor.findMarkers({ plasma: "compile-error" })) {
            marker.destroy();
        }
    }
}
function getDefaultMetadata(version, type) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <status>Active</status>
</${type}>`;
}
