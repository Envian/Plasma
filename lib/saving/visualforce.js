"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

export default class VisualforceSave extends ToolingSave {
    constructor(project, name, savedFiles) {
        super(project, name, savedFiles);
        this.type = this.source.folder === "pages" ? "ApexPage" : "ApexComponent";
    }

    queryForConflicts() {
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new ToolingAPI.Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Markup
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
                body: queryResult[0].Markup,
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