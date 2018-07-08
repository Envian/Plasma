"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const query_js_1 = require("../api/tooling/query.js");
const crud_sobject_js_1 = require("../api/tooling/crud-sobject.js");
const tooling_save_js_1 = require("./tooling-save.js");
const soap_helpers_js_1 = require("../api/soap-helpers.js");
class StaticResourceSave extends tooling_save_js_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles);
        this.path = entity + ".resource";
        this.state = project.files[this.path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new query_js_1.default(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
            FROM StaticResource
            WHERE ${whereClause}
        `);
    }
    getConflictQuery() {
        return this.query;
    }
    async handleConflicts() {
        const queryResult = await this.query.getResult();
        if (queryResult.length) {
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: "StaticResource",
                body: queryResult[0].Body,
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
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                attributes = {
                    cacheControl: soap_helpers_js_1.getText(metadataFile, "//met:cacheControl/text()"),
                    contentType: soap_helpers_js_1.getText(metadataFile, "//met:contentType/text()")
                };
            }
            else {
                throw Error("New static resources must have a meta xml provided.");
            }
        }
        this.saveRequest = new crud_sobject_js_1.default({
            sobject: "StaticResource",
            method: this.state ? "PATCH" : "POST",
            id: this.state && this.state.id,
            body: {
                Body: this.source && btoa(unescape(encodeURIComponent(await this.source.read()))),
                CacheControl: attributes && attributes.cacheControl,
                ContentType: attributes && attributes.contentType
            }
        });
        return [this.saveRequest];
    }
    async handleSaveResult() {
    }
    async getBody(url) {
        return "TODO: Fix server copies of static resources";
    }
}
exports.default = StaticResourceSave;
