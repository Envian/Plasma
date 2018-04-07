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
            SELECT id, lastModifiedBy.Name, lastModifiedDate, body
            FROM ${this.type}
            WHERE id = '${this.state.id}'
        `);
        return this.query;
    }

    async checkConflicts(project) {
        // TODO: Check for Conflicts
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
