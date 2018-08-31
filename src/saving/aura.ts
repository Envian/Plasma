import Project from '../project';
import FileInfo from './file-info';
import Query from '../api/tooling/query';
import CRUDRequest from '../api/tooling/crud-sobject';
import { mapby } from '../helpers';
import { getText } from '../api/soap-helpers';
import ToolingRequest from '../api/tooling/tooling-request';
import ToolingStandaloneSave from './tooling-standalone';

export default class Aura extends ToolingStandaloneSave {
    private metadata?: FileInfo;
    public readonly query: Query;
    private savesByType: { [key: string]: CRUDRequest<any> } = {};
    private bundleId?: string;

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
        const queryList = await this.query.getResult();
        const queryResults = mapby<string, AuraQuery>(queryList, record => record.DefType);

        if (queryList.length) {
            this.bundleId = queryList[0].AuraDefinitionBundleId;
        }

        for (const file of this.files) {
            if (!file.isMetadata) {
                const serverFile = queryResults.get(getComponentType(file.path));
                const state = this.project.files[file.path];

                if (serverFile) {
                    await this.handleConflictWithServer({
                        modifiedBy: serverFile.LastModifiedBy.Name,
                        modifiedDate: serverFile.LastModifiedDate,
                        id: serverFile.Id,
                        type: "AuraDefinition",
                        body: serverFile.Source,
                        localState: state,
                        path: file.path,
                        name: file.entity
                    });
                } else {
                    await this.handleConflictsMissingFromServer(state);
                }
            }
        }
    }

    async getSaveRequests(): Promise<Array<ToolingRequest<any>>> {
        const queryResults = await this.query.getResult();
        const saveRequests = [] as Array<CRUDRequest<any>>;
        let attributes;

        // Check if we need to create the metadata file (aka new file)
        if (!this.metadata && !queryResults.length) {
            const rootComponent = this.files.find(file => file.path.endsWith("cmp") || file.path.endsWith("app"));
            if (rootComponent) {
                this.metadata = new FileInfo(this.project, rootComponent.path + "-meta.xml");
                this.files.push(this.metadata);
                attributes = {
                    developerName: this.name,
                    masterLabel: this.name,
                }
            } else {
                // Aura Components require a cmp or app to save.
                this.errorMessage = `${this.entity} is missing a component or app file.`;
                return [];
            }
        }

        if (this.metadata) {
            if (this.metadata.body) {
                const metadataFile = new DOMParser().parseFromString(await this.metadata.read(), "text/xml");
                attributes = {
                    apiVersion: getText(metadataFile, "//met:apiVersion/text()"),
                    description: getText(metadataFile, "//met:description/text()"),
                    developerName: attributes && attributes.developerName,
                    masterLabel: attributes && attributes.masterLabel
                };
            } else {
                attributes = {
                    apiVersion: this.project.apiVersion,
                    description: this.name,
                    developerName: attributes && attributes.developerName,
                    masterLabel: attributes && attributes.masterLabel
                };
                await this.metadata.write(getAuraDefaultMetadata(this.project.apiVersion, this.name));
            }

            this.savesByType["_METADATA"] = new CRUDRequest({
                sobject: "AuraDefinitionBundle",
                method: this.bundleId ? "PATCH" : "POST",
                id: this.bundleId,
                body: attributes,
                referenceId: this.name + "_bundleId"
            });
            saveRequests.push(this.savesByType["_METADATA"]);
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
                    AuraDefinitionBundleId: this.bundleId || `@{${this.name}_bundleId.id}`
                }
            });
            this.savesByType[type] = request;
            return request;
        }) as Array<CRUDRequest<any>>).filter(save => save);
    }

    async handleSaveResult(): Promise<void> {
        this.errorMessage = this.files.reduce((err, file) => {
            const result = this.savesByType[getComponentType(file.path)].result;
            if (result && !result.success) {
                // TODO: Aura saves do not have robust error handling. It is possible to pull row number out of message with regex.
                return err + `${file.path}:\n  ${result[0].message.replace(/\n/g, "\n  ")}`;
            } else if (!file.isMetadata) {
                this.project.files[file.path] = Object.assign(this.project.files[file.path] || {}, {
                    lastSyncDate: new Date().toISOString(),
                    type: "AuraDefinitionBundle"
                });
                if (result && result.id) {
                    this.project.files[file.path].id = result.id;
                }
            }
            return err;
        }, "");
    }
}

interface AuraQuery {
    Id: string,
    DefType: string,
    Source: string,
    LastModifiedDate: string,
    AuraDefinitionBundleId: string,
    LastModifiedBy: { Name: string }
}

function getAuraDefaultMetadata(version: string, description: string): string {
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
    "CONTROLLER": "JS",
    "HELPER": "JS",
    "RENDERER": "JS",
    "COMPONENT": "XML",
    "STYLE": "CSS",
    "DOCUMENTATION": "XML",
    "DESIGN": "XML",
    "SVG": "XML",
    "APPLICATION": "XML",
    "EVENT": "XML",
    "INTERFACE": "XML",
    "TOKENS": "XML"
};
