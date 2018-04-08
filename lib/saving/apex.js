"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

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
    }

    queryForConflicts() {
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

    async getSaveRequest(containerId) {
        return new ToolingAPI.CRUDRequest({
            sobject: this.type + "Member",
            method: "POST",
            body: {
                Body: this.source.body,
                ContentEntityId: this.state.id,
                MetadataContainerId: `@{${containerId}.id}`,
            }
        });
    }
}
