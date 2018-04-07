"use babel";

import { confirm } from "../helpers.js";

export default class ToolingSave {
    constructor(name, savedFiles) {
        this.name = name.substring(name.lastIndexOf("/")  +1, name.indexOf("."));
        this.source = null;
        this.metadata = null;
        this.state = null;
        this.skip = false;

        for (const file of savedFiles) {
            if (file.path.endsWith("-meta.xml")) {
                this.metadata = file;
            } else {
                this.source = file;
            }
        }

        if (!this.source) {
            this.source = { path: this.metadata.target };
        }
    }

    async getConflictQuery(project) {
        if (!this.source.body) {
            this.source.body = await project.srcFolder.getFile(this.source.path).read(true);
        }
        if (this.metadata && !this.metadata.body) {
            this.metadata.body = await project.srcFolder.getFile(this.metadata.path).read(true);
        }

        this.state = project.metadata[this.source.path];
        return this.queryForConflicts(project);
    }

    async handleSaveResult(project, results) {
        const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === project.srcFolder.getFile(this.source.path).getPath());
        if (results.every(result => result.success)) {
            project.metadata[results[0].fileName] = Object.assign(project.metadata[results[0].fileName] || {}, {
                id: results[0].id,
                lastSyncDate: results[0].createdDate,
                type: results[0].componentType
            });
            for (const editor of editors) {
                editor.findMarkers({ plasma: "compile-error" }).forEach(marker => marker.destroy());
            }
            return true;
        } else {
            const linePadding = results.reduce(result => Math.max(result.lineNumber || 0)).toString().length;
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
        }
    }

    async handleConflictWithServer(project, serverRecord) {
        if (this.state) {
            if (Date.parse(this.state.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                return this.overwritePrompt(project, serverRecord);
            } else {
                this.skip = false;
            }
        } else {
            return this.overwritePrompt(project, serverRecord);
        }
    }

    async handleConflictsWithoutServer(project) {
        this.skip = true;
    }

    async overwritePrompt(project, { modifiedBy, modifiedDate, id, type, body }) {
        const response = await confirm({
            type: "question",
            title: "Server Conflict",
            message: `${this.name} has been modified on the server`,
            detail: `Modified by ${modifiedBy} on ${new Date(modifiedDate).toLocaleString()}.`,
            buttons: ["Overwrite", "Use Server Copy", "Skip"],
            cancelId: 2
        });
        switch (response) {
            case 0: // Overwrite
                this.skip = false;
                return;
            case 1: // Server copy
                project.srcFolder.getFile(this.source.path).write(body);
                project.metadata[this.source.path] = Object.assign(project.metadata[this.source.path] || {}, {
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

    async queryForConflicts(project) { }

    async checkConflicts(project) { }

    getSaveRequest(project, containerId) { }
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
