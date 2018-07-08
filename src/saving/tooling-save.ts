"use babel";

import { FindDisplayMarkerOptions, TextEditor, RangeCompatible } from "atom";

import { confirm } from "../helpers.js";
import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import FileInfo from './file-info.js';


export default abstract class ToolingSave {
    protected readonly project : Project;
    protected readonly entity: string;
    protected readonly name: string;
    protected readonly folder: string;
    protected readonly files: Array<FileInfo>; // TODO: Need a wrapper class for the saved file.
    public skip: boolean;
    public success: boolean;

    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>) {
        this.project = project;
        this.entity = entity;
        this.name = getName(this.entity);
        this.folder = this.entity.substring(0, this.entity.indexOf("/"));
        this.files = savedFiles;

        this.skip = false;
        this.success = false;
    }

    // Returns a query that gets the state of the file on the server.
    abstract getConflictQuery(): Query;

    // Handles the result of query called in getConflictQuery.
    abstract async handleConflicts(): Promise<void>;

    // Generates a list of save requests to save the changes made to this entity.
    abstract async getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>>;

    abstract async handleSaveResult(results?: Array<CompileResult>): Promise<void>;
    // async handleSaveResult(results?: Array<CompileResult>): Promise<void> {
    //     console.log(results);
    //     const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === this.project.srcFolder.getFile(this.path).getPath());
    //
    //     if (results.every((result: CompileResult) => result.success)) {
    //         this.project.files[results[0].fileName] = Object.assign(this.project.files[results[0].fileName] || {}, {
    //             id: results[0].id,
    //             lastSyncDate: results[0].createdDate,
    //             type: results[0].componentType
    //         });
    //         for (const editor of editors) {
    //             // NOTE: Typescript definitions don't support custom property searches.
    //             editor.findMarkers({ plasma: "compile-error" } as FindDisplayMarkerOptions).forEach(marker => marker.destroy());
    //         }
    //         this.success = true;
    //     } else {
    //         const linePadding = results.reduce((acc: number, result: CompileResult) => Math.max(acc, result.lineNumber || 0), 0).toString().length;
    //         const errors = results.map((result: CompileResult) => {
    //             if (result.lineNumber) {
    //                 addErrorMarker(editors, result.lineNumber - 1);
    //                 return `Line ${result.lineNumber.toString().padStart(linePadding)}: ${result.problem}`;
    //             } else {
    //                 return result.problem;
    //             }
    //         });
    //         atom.notifications.addError(`Failed to save ${this.name}.`, {
    //             detail: errors.join("\n"),
    //             dismissable: true
    //         });
    //         this.success = false;
    //     }
    // }

    // TODO: Provide proper type & Cleanup
    async handleConflictWithServer(serverRecord: ServerFileInformation) {
        if (serverRecord.localState) {
            if (Date.parse(serverRecord.localState.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                return this.overwritePrompt(serverRecord);
            }
        } else {
            return this.overwritePrompt(serverRecord);
        }
    }

    async handleConflictsMissingFromServer(localState?: FileStatusItem) {
        // If we have a local copy of the file info, but its not found on the server, there's a problem.
        // If the file is found neither on the server, nor locally, its considered a net new file.
        if (localState) {
            this.skip = true;
            throw Error("Unable to save: File missing from server.");
        }
    }

    async overwritePrompt(options: ServerFileInformation): Promise<void> {
        const response = await confirm({
            type: "question",
            title: "Server Conflict",
            message: `${options.name} has been modified on the server`,
            detail: `Modified by ${options.modifiedBy} on ${new Date(options.modifiedDate).toLocaleString()}.`,
            buttons: ["Overwrite", "Use Server Copy", "Skip"],
            cancelId: 2
        });
        switch (response) {
            case 0: // Overwrite
                this.skip = false;
                return;
            case 1: // Server copy
                this.project.srcFolder.getFile(options.path).write(await this.getBody(options.body));
                this.project.files[options.path] = Object.assign(this.project.files[options.path] || {}, {
                    id: options.id,
                    lastSyncDate: options.modifiedDate,
                    type: options.type
                });
                this.skip = true;
                return;
            case 2: // Skip
                this.skip = true;
                return;
        }
    }

    // Static resources require a request to get the body
    async getBody(body: string): Promise<string> { return body; }
}

function addErrorMarker(editors: Array<TextEditor>, line: number): void {
    if (line == null || !editors || !editors.length) return;

    for (const editor of editors) {
        const range: RangeCompatible = [[line, 0], [line, editor.getBuffer().getLines()[line].length]];
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "touch"
        } as any), {
            type: "line",
            class: "plasma-error"
        });

        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "never"
        } as any), {
            type: "line-number",
            class: "plasma-error"
        });
    }
}

function getName(path: string): string {
    const extn = path.indexOf(".");
    return path.substring(path.lastIndexOf("/") + 1, extn === -1 ? undefined : extn);
}

export interface CompileResult {
    fileName: string;
    id: string;
    createdDate: string;
    componentType: string;
    lineNumber: number;
    success: boolean;
    problem: string;
}

export interface ServerFileInformation {
    modifiedBy: string;
    modifiedDate: string;
    id: string;
    type: string;
    body: string;
    path: string;
    name: string;
    localState?: FileStatusItem;
}
