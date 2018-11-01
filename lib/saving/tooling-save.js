"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_js_1 = require("../helpers.js");
class ToolingSave {
    constructor(project, entity) {
        this.project = project;
        this.entity = entity;
        this.name = getName(this.entity);
        this.folder = this.entity.substring(0, this.entity.indexOf("/"));
        this.skip = false;
    }
    async handleConflictWithServer(serverRecord) {
        if (serverRecord.localState) {
            if (Date.parse(serverRecord.localState.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                await this.overwritePrompt(serverRecord);
                const localFile = this.project.files[serverRecord.path] || {};
                this.project.files[serverRecord.path] = Object.assign(localFile, {
                    id: serverRecord.id,
                    lastSyncDate: localFile.lastSyncDate || "1970-1-1",
                    type: serverRecord.type
                });
            }
        }
        else {
            return this.overwritePrompt(serverRecord);
        }
    }
    async handleConflictsMissingFromServer(localState) {
        if (localState) {
            this.skip = true;
            throw Error("Unable to save: File missing from server.");
        }
    }
    async overwritePrompt(options) {
        const response = await helpers_js_1.confirm({
            type: "question",
            title: "Server Conflict",
            message: `${options.name} has been modified on the server`,
            detail: `Modified by ${options.modifiedBy} on ${new Date(options.modifiedDate).toLocaleString()}.`,
            buttons: ["Overwrite", "Use Server Copy", "Skip"],
            cancelId: 2
        });
        switch (response) {
            case 0:
                this.skip = false;
                return;
            case 1:
                this.project.srcFolder.getFile(options.path).write(typeof (options.body) === "string" ? options.body : await options.body());
                this.skip = true;
                return;
            case 2:
                this.skip = true;
                return;
        }
    }
}
exports.default = ToolingSave;
function getName(path) {
    const extn = path.indexOf(".");
    return path.substring(path.lastIndexOf("/") + 1, extn === -1 ? undefined : extn);
}
