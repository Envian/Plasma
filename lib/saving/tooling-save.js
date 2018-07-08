"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_js_1 = require("../helpers.js");
class ToolingSave {
    constructor(project, entity, savedFiles) {
        this.project = project;
        this.entity = entity;
        this.name = getName(this.entity);
        this.folder = this.entity.substring(0, this.entity.indexOf("/"));
        this.files = savedFiles;
        this.skip = false;
        this.success = false;
    }
    async handleConflictWithServer(serverRecord) {
        if (serverRecord.localState) {
            if (Date.parse(serverRecord.localState.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                return this.overwritePrompt(serverRecord);
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
                this.project.srcFolder.getFile(options.path).write(await this.getBody(options.body));
                this.project.files[options.path] = Object.assign(this.project.files[options.path] || {}, {
                    id: options.id,
                    lastSyncDate: options.modifiedDate,
                    type: options.type
                });
                this.skip = true;
                return;
            case 2:
                this.skip = true;
                return;
        }
    }
    async getBody(body) { return body; }
}
exports.default = ToolingSave;
function addErrorMarker(editors, line) {
    if (line == null || !editors || !editors.length)
        return;
    for (const editor of editors) {
        const range = [[line, 0], [line, editor.getBuffer().getLines()[line].length]];
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "touch"
        }), {
            type: "line",
            class: "plasma-error"
        });
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "never"
        }), {
            type: "line-number",
            class: "plasma-error"
        });
    }
}
function getName(path) {
    const extn = path.indexOf(".");
    return path.substring(path.lastIndexOf("/") + 1, extn === -1 ? undefined : extn);
}
