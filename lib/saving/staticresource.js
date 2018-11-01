"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const file_info_1 = tslib_1.__importDefault(require("./file-info"));
const query_1 = tslib_1.__importDefault(require("../api/tooling/query"));
const crud_sobject_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject"));
const soap_helpers_1 = require("../api/soap-helpers");
const tooling_standalone_1 = tslib_1.__importDefault(require("./tooling-standalone"));
class StaticResource extends tooling_standalone_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity);
        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.isMetadata) || new file_info_1.default(project, this.entity);
        this.metadata = savedFiles.find(file => file.isMetadata) || new file_info_1.default(project, this.entity + "-meta.xml");
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new query_1.default(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
            FROM StaticResource
            WHERE ${whereClause}
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleQueryResult() {
        const queryResult = await this.query.getResult();
        if (queryResult.length) {
            this.resourceId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: "StaticResource",
                body: queryResult[0].Body,
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        }
        else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }
    async getSaveRequests() {
        let attributes;
        if (await this.metadata.exists()) {
            const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
            attributes = {
                cacheControl: soap_helpers_1.getText(metadataFile, "//met:cacheControl/text()"),
                contentType: soap_helpers_1.getText(metadataFile, "//met:contentType/text()")
            };
        }
        else if (!this.resourceId) {
            throw Error("New static resources must include a -meta.xml file.");
        }
        this.saveRequest = new crud_sobject_1.default({
            sobject: "StaticResource",
            method: this.resourceId ? "PATCH" : "POST",
            id: this.resourceId,
            body: {
                Body: this.source && btoa(unescape(encodeURIComponent(await this.source.read()))),
                Name: this.name,
                CacheControl: attributes && attributes.cacheControl,
                ContentType: attributes && attributes.contentType
            }
        });
        return [this.saveRequest];
    }
    async handleSaveResult() {
        const result = this.saveRequest && this.saveRequest.result;
        if (result && result.length && !result[0].success) {
            this.errorMessage = `${this.entity}:\n  ${result[0].message.replace(/\n/g, "\n  ")}`;
        }
        else {
            this.project.files[this.entity] = Object.assign(this.project.files[this.entity] || {}, {
                lastSyncDate: new Date().toISOString(),
                type: "StaticResource"
            });
            if (result && result.id) {
                this.project.files[this.entity].id = result.id;
            }
        }
    }
}
exports.default = StaticResource;
