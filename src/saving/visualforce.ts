import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import CRUDRequest from "../api/tooling/crud-sobject.js";
import { getText } from "../api/soap-helpers.js";
import FileInfo from './file-info.js';
import ToolingContainerSave from './tooling-container.js';
import { ComponentMessage } from './save-manager.js';
import { addErrorMarker, clearMarkers } from '../helpers.js';

export default class VisualforceSave extends ToolingContainerSave {
    private readonly type: string;
    private readonly source: FileInfo;
    private metadata?: FileInfo;
    private readonly query: Query;
    private readonly state?: FileStatusItem;
    private pageId?: string;

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity, savedFiles);
        this.type = this.folder === "pages" ? "ApexPage" : "ApexComponent";

        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));

        // Source is required,
        if (!this.source) {
            this.source = new FileInfo(project, this.entity);
            savedFiles.push(this.source);
        }

        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Markup
            FROM ${this.type}
            WHERE ${whereClause}
        `);
    }

    getConflictQuery(): Query {
        return this.query;
    }

    async handleQueryResult(): Promise<void> {
        const queryResult = this.query.getResult();
        if (queryResult.length) {
            this.pageId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0].Markup,
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
        if (this.pageId) {
            requestBody.ContentEntityId = this.pageId;
        } else {
            requestBody.FullName = this.name;
        }

        // If we're uploading metadata with this file, populate the attribtues attribute.
        if (this.metadata) {
            if (!await this.metadata.exists()) {
                await this.metadata.write(getDefaultMetadata(this.project.apiVersion, this.name, this.type));
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
            clearMarkers(editors);
            return;
        }

        // NOTE: VF page errors do not provide line numbers
        const errors = [] as Array<string>;
        for (const result of results) {
            // Error for ui display.
            const prefix = result.lineNumber ? result.lineNumber.toString() + ": " : "";
            const message = result.problem.replace(/\n/g, "\n" + "".padStart(prefix.length, " "));
            errors.push(prefix + message);

            if (result.lineNumber) {
                // Highlight errors
                addErrorMarker(editors, result.lineNumber - 1);
            }
        }
        this.errorMessage = errors.filter(error => error).join("\n\n");
    }
}


function getDefaultMetadata(version: string, label: string, type: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <label>${label}</label>
</${type}>`;
}
