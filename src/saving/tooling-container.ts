import ToolingSave from "./tooling-save";
import ToolingRequest from "../api/tooling/tooling-request";
import { ComponentMessage } from "./save-manager";
import FileInfo from "./file-info";
import Project, { FileStatusItem } from "../project.js";
import Query from "../api/tooling/query";
import { getText } from "../api/soap-helpers";
import CRUDRequest from "../api/tooling/crud-sobject";
import { clearMarkers, addErrorMarker } from "../helpers";

const FOLDER_TO_TYPE: {[key: string]: string} = {
    "classes": "ApexClass",
    "triggers": "ApexTrigger",
    "pages": "ApexPage",
    "components": "ApexComponent"
};

export default abstract class ToolingContainerSave extends ToolingSave {
    protected readonly type: string;
    protected readonly source: FileInfo;
    protected readonly metadata: FileInfo;
    private readonly query: Query;
    private readonly bodyField: string;
    protected readonly state?: FileStatusItem;
    protected memberId?: string;

    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>, bodyField: string) {
        super(project, entity);
        this.bodyField = bodyField;
        this.type = FOLDER_TO_TYPE[this.folder];
        this.state = project.files[this.entity];
        this.source = savedFiles.find(file => !file.isMetadata) || new FileInfo(this.project, this.entity);
        this.metadata = savedFiles.find(file => file.isMetadata) || new FileInfo(this.project, this.entity + "-meta.xml");

        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, ${this.bodyField}
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
            this.memberId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: this.type,
                body: queryResult[0][this.bodyField],
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        } else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }

    async getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>> {
        const requestBody: any = {
            Body: await this.source.read(),
            MetadataContainerId: `@{${containerName}.id}`
        };

        // Check if updating or creating new
        if (this.memberId) {
            requestBody.ContentEntityId = this.memberId;
        } else {
            requestBody.FullName = this.name;
        }

        if (!await this.metadata.exists()) {
            await this.metadata.write(this.getDefaultMetadata());
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
        clearMarkers(editors);

        if (results.length == 1 && results[0].success) {
            const fileEntry = this.project.files[this.entity] || {};
            fileEntry.id = results[0].id || fileEntry.id;
            fileEntry.lastSyncDate = new Date().toISOString();
            fileEntry.type = this.type;
            this.project.files[this.entity] = fileEntry;
            return;
        }

        // NOTE: VF page errors do not always provide line numbers
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

    abstract getDefaultMetadata(): any;
}
