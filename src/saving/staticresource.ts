import Project, { FileStatusItem } from '../project';
import FileInfo from './file-info';
import Query from '../api/tooling/query';
import CRUDRequest from '../api/tooling/crud-sobject';
import { getText } from '../api/soap-helpers';
import ToolingRequest from '../api/tooling/tooling-request';
import ToolingStandaloneSave from './tooling-standalone';

export default class StaticResource extends ToolingStandaloneSave {
    private readonly state?: FileStatusItem;
    private readonly source?: FileInfo;
    private metadata?: FileInfo;
    private readonly query: Query;
    private saveRequest?: CRUDRequest<any>;
    private resourceId?: string;

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity, savedFiles);

        this.state = project.files[this.entity];
        this.metadata = savedFiles.find(file => file.isMetadata);
        this.source = savedFiles.find(file => !file.isMetadata) || new FileInfo(project, this.entity);

        const whereClause = this.state ? `Id = '${this.state.id}'` : `Name = '${this.name}'`;
        this.query = new Query(`
            SELECT Id, LastModifiedBy.Name, LastModifiedDate, Body
            FROM StaticResource
            WHERE ${whereClause}
        `);
    }

    getConflictQuery(): Query {
        return this.query;
    }

    async handleConflicts(): Promise<void> {
        const queryResult = await this.query.getResult();
        if (queryResult.length) {
            this.resourceId = queryResult[0].Id;
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: "StaticResource",
                body: queryResult[0].Body,
                localState: this.state,
                path: this.entity,
                name: this.name
            });
        } else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }

    async getSaveRequests(): Promise<Array<ToolingRequest<any>>> {
        let attributes;

        // Check if we need to create the metadata file (aka new file)
        if (!this.metadata && !this.resourceId) {
            const metadataFile = new FileInfo(this.project, this.entity + "-meta.xml");
            if (await metadataFile.exists()) {
                this.metadata = metadataFile;
            }
        }

        if (this.metadata) {
            const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
            attributes = {
                cacheControl: getText(metadataFile, "//met:cacheControl/text()"),
                contentType: getText(metadataFile, "//met:contentType/text()")
            };
        } else if (!this.resourceId) {
            // TODO: What do we do about brand new static resources?
            throw Error("New static resources must include a -meta.xml file.")
            // this.metadata.attributes = {
            //     cacheControl: "private",
            //     contentType: "image/meme-macro"
            // };
            // await this.project.srcFolder.getFile(this.metadata.path)
            //     .write(getDefaultMetadata(this.project.apiVersion, this.type));
        }

        this.saveRequest = new CRUDRequest({
            sobject: "StaticResource",
            method: this.resourceId ? "PATCH" : "POST",
            id: this.resourceId,
            body: {
                Body: this.source && btoa(unescape(encodeURIComponent(await this.source.read()))),
                Name: this.name,
                CacheControl: attributes && attributes.cacheControl,
                ContentType: attributes && attributes.contentType
            }
        });
        return [this.saveRequest];
    }


    async handleSaveResult(): Promise<void> {
        const result = this.saveRequest && this.saveRequest.result;
        if (result && result.length && !result[0].success) {
            // Static resources have no content validation. Any errores apply to the entire file.
            this.errorMessage = `${this.entity}:\n  ${result[0].message.replace(/\n/g, "\n  ")}`;
        } else {
            this.project.files[this.entity] = Object.assign(this.project.files[this.entity] || {}, {
                lastSyncDate: new Date().toISOString(),
                type: "StaticResource"
            });
            if (result && result.id) {
                this.project.files[this.entity].id = result.id;
            }
        }
    }
}
