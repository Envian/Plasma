"use babel";

import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import CRUDRequest from "../api/tooling/crud-sobject.js";
import ToolingSave, { CompileResult } from "./tooling-save.js";
import { getText } from "../api/soap-helpers.js";
import FileInfo from './file-info.js';

export default class VisualforceSave extends ToolingSave {
    private readonly type: string;
    private readonly path: string;
    private readonly source: FileInfo;
    private readonly metadata?: FileInfo;
    private readonly query: Query;
    private readonly state?: FileStatusItem;

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity, savedFiles);
        this.type = this.folder === "pages" ? "ApexPage" : "ApexComponent";
        this.path = entity + ".cls";

        this.state = project.files[this.path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));

        // Source is required,
        if (!this.source) {
            this.source = new FileInfo(project, this.path);
            savedFiles.push(this.source);
        }

        // Ensure metadata is sent with new files.
        if (!this.state && !this.metadata) {
            this.metadata = new FileInfo(project, this.path + "-meta.xml");
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

    async handleConflicts(): Promise<void> {
        const queryResult = this.query.getResult();
        if (queryResult.length) {
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0].Markup,
                localState: this.state,
                path: this.path,
                name: this.name
            });
        } else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }

    async getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>> {
        let attributes;

        // If we're uploading metadata with this file, populate the attribtues attribute.
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                attributes = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    label: getText(metadataFile, "//met:label/text()")
                };
            } else {
                // If the metadata file does not exist, create it with a default meta.xml
                attributes = {
                    apiVersion: this.project.apiVersion,
                    label: this.name
                };
                await this.metadata.write(getDefaultMetadata(this.project.apiVersion, this.name, this.type));
            }
        }

        return [new CRUDRequest({
            sobject: this.type + "Member",
            method: "POST",
            body: {
                Body: await this.source.read(),
                ContentEntityId: this.state && this.state.id,
                FullName: (this.state && this.state.id) ? undefined : this.name,
                MetadataContainerId: `@{${containerId}.id}`,
                Metadata: attributes
            }
        })];
    }

    async handleSaveResult(results?: Array<CompileResult>): Promise<void> {

    }
}


function getDefaultMetadata(version: string, label: string, type: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <label>${label}</label>
</${type}>`;
}
