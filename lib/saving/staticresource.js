"use babel";

import ToolingAPI from "../api/tooling.js";
import ToolingSave from "./tooling-save.js";

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
    }

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
                state: this.state,
                path: this.path,
                name: this.name
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
            return this.saveRequest;
        } else {
            throw Error("Unable to automatically create new StaticResources");
        }
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
