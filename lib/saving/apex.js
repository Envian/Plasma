"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";
import { getText } from "../api/soap-helpers.js";

export default class ApexSave extends ToolingSave {
    constructor(project, path, savedFiles) {
        super(project, path, savedFiles);
        this.type = this.folder === "classes" ? "ApexClass" : "ApexTrigger";

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
            FROM ${this.type}
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
                type: this.type,
                body: queryResult[0].Body,
                state: this.state,
                path: this.path,
                name: this.name
            });
        } else {
            return this.handleConflictsWithoutServer();
        }
    }

    async prepareSave() {
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                this.metadata.attributes = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    status: getText(metadataFile, "//met:status/text()")
                };
            } else {
                this.metadata.attributes = {
                    apiVersion: this.project.apiVersion,
                    status: "Active"
                };
                await this.project.srcFolder.getFile(this.metadata.path)
                    .write(getDefaultMetadata(this.project.apiVersion, this.type));
            }
        }
    }

    getSaveRequest(containerId) {
        return new ToolingAPI.CRUDRequest({
            sobject: this.type + "Member",
            method: "POST",
            body: {
                Body: this.source.body,
                ContentEntityId: this.state && this.state.id,
                MetadataContainerId: `@{${containerId}.id}`,
                Metadata: this.metadata && this.metadata.attributes
            }
        });
    }
}


function getDefaultMetadata(version, type) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${apiVersion}</apiVersion>
    <status>Active</status>
</${type}>`;
}
