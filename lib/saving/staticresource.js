"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const query_1 = tslib_1.__importDefault(require("../api/tooling/query"));
const crud_sobject_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject"));
const soap_helpers_1 = require("../api/soap-helpers");
const tooling_standalone_1 = tslib_1.__importDefault(require("./tooling-standalone"));
class StaticResource extends tooling_standalone_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles);
        this.path = entity + ".resource";
        this.state = project.files[this.path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));
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
    async getSaveRequests() {
        let attributes;
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                attributes = {
                    cacheControl: soap_helpers_1.getText(metadataFile, "//met:cacheControl/text()"),
                    contentType: soap_helpers_1.getText(metadataFile, "//met:contentType/text()")
                };
            }
            else {
                throw Error("New static resources must have a meta xml provided.");
            }
        }
        this.saveRequest = new crud_sobject_1.default({
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
    async handleSaveResult(results) {
        console.log(results);
    }
}
exports.default = StaticResource;
