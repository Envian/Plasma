"use babel";

import { confirm } from "../helpers.js";

export default class ToolingSave {
    constructor(project, path, savedFiles) {
        this.project = project;
        this.path = path;
        this.name = getName(path);
        this.folder = path.substring(0, path.indexOf("/"));
        this.files = savedFiles;

        this.skip = null;
        this.success = null;
    }

    async getConflictQuery() {
        for (const file of this.files) {
            if (!file.body) {
                file.body = await this.project.srcFolder.getFile(file.path).read(true);
            }
        }
        return this.queryForConflicts();
    }

    async handleSaveResult(results) {
        const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === this.project.srcFolder.getFile(this.path).getPath());
        if (results.every(result => result.success)) {
            this.project.metadata[results[0].fileName] = Object.assign(this.project.metadata[results[0].fileName] || {}, {
                id: results[0].id,
                lastSyncDate: results[0].createdDate,
                type: results[0].componentType
            });
            for (const editor of editors) {
                editor.findMarkers({ plasma: "compile-error" }).forEach(marker => marker.destroy());
            }
            this.success = true;
        } else {
            const linePadding = results.reduce((acc, result) => Math.max(acc, result.lineNumber || 0), 0).toString().length;
            const errors = results.map(result => {
                if (result.lineNumber) {
                    addErrorMarker(editors, result.lineNumber - 1);
                    return `Line ${result.lineNumber.toString().padStart(linePadding)}: ${result.problem}`;
                } else {
                    return result.problem;
                }
            });
            atom.notifications.addError(`Failed to save ${this.name}.`, {
                detail: errors.join("\n"),
                dismissable: true
            });
            this.success = false;
        }
    }

    async handleConflictWithServer(serverRecord) {
        if (serverRecord.state) {
            if (Date.parse(serverRecord.state.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                return this.overwritePrompt(serverRecord);
            } else {
                this.skip = false;
            }
        } else {
            return this.overwritePrompt(serverRecord);
        }
    }

    async handleConflictsWithoutServer() {
        this.skip = true;
    }

    async overwritePrompt({ modifiedBy, modifiedDate, id, type, body, state, path, name }) {
        const response = await confirm({
            type: "question",
            title: "Server Conflict",
            message: `${name} has been modified on the server`,
            detail: `Modified by ${modifiedBy} on ${new Date(modifiedDate).toLocaleString()}.`,
            buttons: ["Overwrite", "Use Server Copy", "Skip"],
            cancelId: 2
        });
        switch (response) {
            case 0: // Overwrite
                this.skip = false;
                return;
            case 1: // Server copy
                this.project.srcFolder.getFile(path).write(await this.getBody(body));
                this.project.metadata[path] = Object.assign(this.project.metadata[path] || {}, {
                    id: id,
                    lastSyncDate: modifiedDate,
                    type: type
                });
            case 2: // Skip
                this.skip = true;
                return;
        }
    }

    async resolveConflict() { }

    async queryForConflicts() { }

    async checkConflicts() { }

    async getSaveRequest(containerId) { }

    // Static resources require a request to get the body
    async getBody(body) { return body; }
}

function addErrorMarker(editors, line) {
    if (line == null || !editors || !editors.length) return;

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
