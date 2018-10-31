import { RangeCompatible, TextEditor } from "atom";
import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import CRUDRequest from "../api/tooling/crud-sobject.js";
import { getText } from "../api/soap-helpers.js";
import FileInfo from "./file-info.js";
import ToolingContainerSave from "./tooling-container.js";
import { ComponentMessage } from './save-manager.js';

export default class ApexSave extends ToolingContainerSave {
    private readonly type: string;
    private readonly source: FileInfo;
    private metadata?: FileInfo;
    private readonly query: Query;
    private readonly state?: FileStatusItem;
    private classId?: string;

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity, savedFiles);
        this.type = this.folder === "classes" ? "ApexClass" : "ApexTrigger";

        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.isMetadata);
        this.metadata = savedFiles.find(file => file.isMetadata);

        // Source is required,
        if (!this.source) {
            this.source = new FileInfo(project, this.entity);
            savedFiles.push(this.source);
        }

        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
            FROM ${this.type}
            WHERE ${whereClause}
        `);
    }

    getConflictQuery(): Query {
        return this.query;
    }

    async handleQueryResult(): Promise<void> {
        const queryResult = this.query.result;
        if (queryResult && queryResult.length) {
            this.classId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0].Body,
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        } else {
            // Ensure the metadata is included with this request, since there's no Id.
            this.metadata = this.metadata || new FileInfo(this.project, this.source.path + "-meta.xml");
            return this.handleConflictsMissingFromServer(this.state);
        }
    }

    async getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>> {
        const requestBody: any = {
            Body: await this.source.read(),
            MetadataContainerId: `@{${containerName}.id}`
        };

        // Check if updating or creating new
        if (this.classId) {
            requestBody.ContentEntityId = this.classId;
        } else {
            requestBody.FullName = this.name;
        }

        // If we're uploading metadata with this file, populate the attribtues attribute.
        if (this.metadata) {
            if (!await this.metadata.exists()) {
                await this.metadata.write(getDefaultMetadata(this.project.apiVersion, this.type));
                requestBody.Metadata = {
                    apiVersion: this.project.apiVersion,
                    status: "Active"
                };
            } else {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                requestBody.Metadata = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    status: getText(metadataFile, "//met:status/text()")
                };
            }
        }

        return [new CRUDRequest({
            sobject: this.type + "Member",
            method: "POST",
            body: requestBody
        })];
    }

    async handleSaveResult(results: Array<ComponentMessage>): Promise<void> {
        if (results.length == 0) {
            this.errorMessage = "Unable to find save results. Try cleaning the project.";
            return;
        }

        const editors = atom.workspace.getTextEditors().filter(editor => editor.getPath() === this.project.srcFolder.getFile(this.source.path).getPath());
        if (results.length == 1 && results[0].success) {
            // Successful save. Hide errors.
            clearMarkers(editors);
            return;
        }

        const errors = [] as Array<string>;
        for (const result of results) {
            // Error for ui display.
            const prefix = result.lineNumber ? result.lineNumber.toString() + ": " : "";
            const message = result.problem.replace(/\n/g, "\n" + "".padStart(prefix.length, " "));
            errors.push(prefix + message);

            // Highlight errors
            addErrorMarker(editors, result.lineNumber - 1);
        }
        this.errorMessage = errors.filter(error => error).join("\n\n");
    }
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

function clearMarkers(editors: Array<TextEditor>): void {
    for (const editor of editors) {
        // Markers support custom properties but TypeScript does not.
        for (const marker of editor.findMarkers({ plasma: "compile-error" } as any)) {
            marker.destroy();
        }
    }
}

function getDefaultMetadata(version: string, type: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <status>Active</status>
</${type}>`;
}
