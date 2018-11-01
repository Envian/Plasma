//import { TextEditor, RangeCompatible } from "atom";

import { confirm } from "../helpers.js";
import Project, { FileStatusItem } from "../project.js";
import Query from "../api/tooling/query.js";
import FileInfo from './file-info.js';


export default abstract class ToolingSave {
    protected readonly project : Project;
    protected readonly folder: string;
    protected readonly files: Array<FileInfo>; // TODO: Need a wrapper class for the saved file.
    public readonly name: string;
    public readonly entity: string;
    public errorMessage?: string;
    public skip: boolean;

    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>) {
        this.project = project;
        this.entity = entity;
        this.name = getName(this.entity);
        this.folder = this.entity.substring(0, this.entity.indexOf("/"));
        this.files = savedFiles;

        this.skip = false;
    }

    // Returns a query that gets the state of the file on the server.
    abstract getConflictQuery(): Query;

    // Handles the result of query called in getConflictQuery.
    abstract async handleQueryResult(): Promise<void>;


    // TODO: Provide proper type & Cleanup
    async handleConflictWithServer(serverRecord: ServerFileInformation) {
        if (serverRecord.localState) {
            if (Date.parse(serverRecord.localState.lastSyncDate) < Date.parse(serverRecord.modifiedDate)) {
                await this.overwritePrompt(serverRecord);

                // Always make sure that the ID we have stored locally matches the server.
                const localFile = this.project.files[serverRecord.path] || {};
                this.project.files[serverRecord.path] = Object.assign(localFile, {
                    id: serverRecord.id,
                    lastSyncDate: localFile.lastSyncDate || "1970-1-1",
                    type: serverRecord.type
                });
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
                this.project.srcFolder.getFile(options.path).write(typeof(options.body) === "string" ? options.body : await options.body());
                this.skip = true;
                return;
            case 2: // Skip
                this.skip = true;
                return;
        }
    }
}

function getName(path: string): string {
    const extn = path.indexOf(".");
    return path.substring(path.lastIndexOf("/") + 1, extn === -1 ? undefined : extn);
}

export interface ServerFileInformation {
    modifiedBy: string;
    modifiedDate: string;
    id: string;
    type: string;
    body: string | (() => Promise<string>);
    path: string;
    name: string;
    localState?: FileStatusItem;
}
