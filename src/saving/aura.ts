"use babel";

import { mapby } from "../helpers.js";
import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import CRUDRequest from "../api/tooling/crud-sobject.js";
import ToolingSave, { CompileResult } from "./tooling-save.js";
import { getText } from "../api/soap-helpers.js";
import FileInfo from './file-info.js';

export default class AuraSave extends ToolingSave {
    private readonly metadata?: FileInfo;
    private readonly query: Query;
    private savesByType: { [key: string]: CRUDRequest<any> } = {};

    constructor(project: Project, entity: string, savedFiles: Array<any>) {
        super(project, entity,  savedFiles);

        this.metadata = savedFiles.find(file => file.path.endsWith("xml"));
        this.query = new Query(`
            SELECT Id, DefType, Source, LastModifiedBy.Name, LastModifiedDate, AuraDefinitionBundleId
            FROM AuraDefinition
            WHERE AuraDefinitionBundle.DeveloperName = '${this.name}'
        `);
    }

    getConflictQuery(): Query {
        return this.query;
    }

    async handleConflicts(): Promise<void> {
        const queryResults = mapby(await this.query.getResult(), record => record.DefType);
        for (const file of this.files) {
            if (!file.isMetadata) {
                const serverFile = queryResults.get(getComponentType(file.path));
                const state = this.project.files[file.path];
                if (serverFile) {
                    return this.handleConflictWithServer({
                        modifiedBy: serverFile.LastModifiedBy.Name,
                        modifiedDate: serverFile.LastModifiedDate,
                        id: serverFile.Id,
                        type: "AuraDefinition",
                        body: serverFile.Source,
                        localState: state,
                        path: file.path,
                        name: file.path.substr(file.path.lastIndexOf("/") + 1)
                    });
                } else {
                    return this.handleConflictsMissingFromServer(state);
                }
            }
        }
    }

    async getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>> {
        const queryResults = await this.query.getResult();
        const bundleId = queryResults.length && queryResults[0].AuraDefinitionBundleId;
        const saveRequests = [];
        let attributes;

        // Set the attributes so that we can update the
        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(this.metadata.body, "text/xml");
                attributes = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    description: getText(metadataFile, "//met:description/text()")
                };
            } else {
                attributes = {
                    apiVersion: this.project.apiVersion,
                    description: this.name
                };
                await this.project.srcFolder.getFile(this.metadata.path)
                    .write(getDefaultMetadata(this.project.apiVersion, this.name));
            }

            this.savesByType.metadata = new CRUDRequest({
                sobject: "AuraDefinitionBundle",
                method: bundleId ? "PATCH" : "POST",
                id: bundleId,
                body: attributes,
                referenceId: this.name + "_bundleId"
            });
            saveRequests.push(this.savesByType.metadata);
        }

        return saveRequests.concat(this.files.map(file => {
            if (file.isMetadata) return;

            const state = this.project.files[file.path];
            const type = getComponentType(file.path);
            const request = new CRUDRequest({
                sobject: "AuraDefinition",
                method: state ? "PATCH" : "POST",
                id: state && state.id,
                body: {
                    Source: file.body,
                    DefType: type,
                    Format: TYPE_TO_FORMAT[type],
                    AuraDefinitionBundleId: state ? undefined : `@{${this.name}_bundleId.Id}`
                }
            });
            this.savesByType[type] = request;
            return request;
        }) as Array<CRUDRequest<any>>)
    }

    async handleSaveResult(results?: Array<CompileResult>): Promise<void> {

    }
}


function getDefaultMetadata(version: string, description: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${version}</apiVersion>
    <desciption>${description}</description>
</AuraDefinitionBundle>`;
}

function getComponentType(path: string): string {
    if (path.endsWith("Controller.js")) {
       return "CONTROLLER";
   } else if (path.endsWith("Helper.js")) {
       return "HELPER";
   } else if (path.endsWith("Renderer.js")) {
       return "RENDERER";
   } else {
       return EXTENSION_TO_TYPE[path.substr(path.lastIndexOf(".") + 1)];
   }
}

const EXTENSION_TO_TYPE: { [key:string]: string } = {
    "cmp": "COMPONENT",
    "css": "STYLE",
    "auradoc": "DOCUMENTATION",
    "design": "DESIGN",
    "svg": "SVG",
    "app": "APPLICATION",
    "evt": "EVENT",
    "intf": "INTERFACE",
    "tokens": "TOKENS",
    "xml": "_METADATA"
};

const TYPE_TO_FORMAT: { [key:string]: string } = {
    "cmp": "COMPONENT",
    "css": "STYLE",
    "auradoc": "DOCUMENTATION",
    "design": "DESIGN",
    "svg": "SVG",
    "app": "APPLICATION",
    "evt": "EVENT",
    "intf": "INTERFACE",
    "tokens": "TOKENS",
    "xml": "_METADATA"
};
