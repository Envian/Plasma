"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

export default class ApexSave extends ToolingSave {
    constructor(name, savedFiles) {
        super(name, savedFiles);
        this.type = this.source.folder === "classes" ? "ApexClass" : "ApexTrigger";
    }

    queryForConflicts(project) {
        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new ToolingAPI.Query(`
            SELECT id, lastModifiedBy.name, lastModifiedDate, body
            FROM ${this.type}
            WHERE ${whereClause}
        `);
        return this.query;
    }

    async checkConflicts(project) {
        const queryResult = await this.query.result;
console.log(queryResult);
        if (queryResult.length) {
            const serverRecord = queryResult[0];
            if (this.state) {
                console.log(this.state);
                if (Date.parse(this.state.lastSyncDate) < Date.parse(serverRecord.LastModifiedDate)) {
                    return this.overwritePrompt({
                        project,
                        modifiedBy: serverRecord.LastModifiedBy.Name,
                        modifiedDate: serverRecord.LastModifiedDate,
                        id: serverRecord.Id,
                        type: this.type,
                        body: serverRecord.Body
                    });
                } else {
                    this.skip = false;
                }
            } else {
                return this.overwritePrompt({
                    project,
                    modifiedBy: serverRecord.LastModifiedBy.Name,
                    modifiedDate: serverRecord.LastModifiedDate,
                    id: serverRecord.Id,
                    type: this.type,
                    body: serverRecord.Body
                });
            }
        } else {
            if (this.state) {
                // deleted?
                this.skip = true;
            } else {
                // New
                this.skip = true;
            }
        }
    }

    getSaveRequest(project, containerId) {
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
