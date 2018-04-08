"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

export default class StaticResourceSave extends ToolingSave {
    queryForConflicts() {
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
            });
        } else {
            return this.handleConflictsWithoutServer();
        }
    }

    async getSaveRequest(containerId) {
        if (this.state) {
            this.saveRequest = new ToolingAPI.CRUDRequest({
                sobject: "StaticResource",
                method: "PATCH",
                id: this.state.id,
                body: {
                    Body: btoa(unescape(encodeURIComponent(this.source.body)))
                }
            });
        } else {
            throw Error("Unable to automatically create new StaticResources");
        }
    }

    async handleSaveResult() {
        if (await this.saveRequest.result.then(() => true).catch(() => false)) {
            this.project.metadata[this.source.path] = Object.assign(this.project.metadata[this.source.path] || {}, {
                lastSyncDate: new Date().toISOString(),
                type: "StaticResource"
            });
            this.success = true;
        } else {
            // TODO: Figure out how to show an error?
            this.success = false;
        }
    }
}
