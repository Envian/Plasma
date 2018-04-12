"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";
import { getText } from "../api/soap-helpers.js";

export default class StaticResourceSave extends ToolingSave {
    constructor(project, path, savedFiles) {
        super(project, path, savedFiles);

        this.state = project.metadata[path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));

        if (!this.source) {
            this.source = { path: this.metadata.target };
            savedFiles.push(this.source);
        }

        // Ensure metadata is sent with new files.
        if (!this.state && !this.metadata) {
            this.metadata = { path: path + "-meta.xml" };
        }
    }

    getConflictQuery() {
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new ToolingAPI.Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
            FROM StaticResource
            WHERE ${whereClause}
        `);
        return this.query;
    }

    async checkConflicts() {
        const queryResult = await this.query.result;
        if (queryResult.length) {
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: "StaticResource",
                body: queryResult[0].Body,
                state: this.state,
                path: this.path,
                name: this.name
            });
        } else {
            return this.handleConflictsWithoutServer(this.state);
        }
    }

    async prepareSave() {
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                this.metadata.attributes = {
                    cacheControl: getText(metadataFile, "//met:cacheControl/text()"),
                    contentType: getText(metadataFile, "//met:contentType/text()")
                };
            } else {
                // TODO: What do we do about brand new static resources?
                throw Error("New static resources must have a meta xml provided.")
                // this.metadata.attributes = {
                //     cacheControl: "private",
                //     contentType: "image/meme-macro"
                // };
                // await this.project.srcFolder.getFile(this.metadata.path)
                //     .write(getDefaultMetadata(this.project.apiVersion, this.type));
            }
        }
    }


    async getSaveRequest(containerId) {
        this.saveRequest = new ToolingAPI.CRUDRequest({
            sobject: "StaticResource",
            method: this.state ? "PATCH" : "POST",
            id: this.state && this.state.id,
            body: {
                Body: btoa(unescape(encodeURIComponent(this.source.body))),
                CacheControl: this.metadata && this.metadata.attributes.cacheControl,
                ContentType: this.metadata && this.metadata.attributes.contentType
            }
        });
        return this.saveRequest;
    }

    async handleSaveResult() {
        await this.saveRequest.result.then(result => {
            this.project.metadata[this.path] = Object.assign(this.project.metadata[this.path] || {}, {
                lastSyncDate: new Date().toISOString(),
                type: "StaticResource"
            });
            this.success = true;
        }).catch(error => {
            this.success = false;
        });
    }

    async getBody(url) {
        return "TODO: Fix server copies of static resources";
    }
}
