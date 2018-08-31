import Project, { FileStatusItem } from '../project';
import FileInfo from './file-info';
import Query from '../api/tooling/query';
import CRUDRequest from '../api/tooling/crud-sobject';
import { getText } from '../api/soap-helpers';
import ToolingRequest from '../api/tooling/tooling-request';
import ToolingStandaloneSave from './tooling-standalone';
import { CompileResult } from './tooling-save';

export default class StaticResource extends ToolingStandaloneSave {
    private readonly path: string;
    private readonly state?: FileStatusItem;
    private readonly source?: FileInfo;
    private readonly metadata?: FileInfo;
    private readonly query: Query;
    private saveRequest?: CRUDRequest<any>;

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity, savedFiles);

        this.path = entity + ".resource";
        this.state = project.files[this.path];
        this.source = savedFiles.find(file => !file.path.endsWith("-meta.xml"));
        this.metadata = savedFiles.find(file => file.path.endsWith("-meta.xml"));

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
            return this.handleConflictWithServer({
                modifiedBy: queryResult[0].LastModifiedBy.Name,
                modifiedDate: queryResult[0].LastModifiedDate,
                id: queryResult[0].Id,
                type: "StaticResource",
                body: queryResult[0].Body,
                localState: this.state,
                path: this.path,
                name: this.name
            });
        } else {
            return this.handleConflictsMissingFromServer(this.state);
        }
    }

    async getSaveRequests(): Promise<Array<ToolingRequest<any>>> {
        let attributes;

        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                attributes = {
                    cacheControl: getText(metadataFile, "//met:cacheControl/text()"),
                    contentType: getText(metadataFile, "//met:contentType/text()")
                };
            } else {
                // TODO: What do we do about brand new static resources?
                throw Error("New static resources must have a meta xml provided.")
                // this.metadata.attributes = {
                //     cacheControl: "private",
                //     contentType: "image/meme-macro"
                // };
                // await this.project.srcFolder.getFile(this.metadata.path)
                //     .write(getDefaultMetadata(this.project.apiVersion, this.type));
            }
        }

        this.saveRequest = new CRUDRequest({
            sobject: "StaticResource",
            method: this.state ? "PATCH" : "POST",
            id: this.state && this.state.id,
            body: {
                Body: this.source && btoa(unescape(encodeURIComponent(await this.source.read()))),
                CacheControl: attributes && attributes.cacheControl,
                ContentType: attributes && attributes.contentType
            }
        });
        return [this.saveRequest];
    }


    async handleSaveResult(results?: Array<CompileResult>): Promise<void> {
        console.log(results);
    }
}
