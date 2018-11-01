import Project, { FileStatusItem } from "../project.js";
import Query from "../api/tooling/query.js";
export default abstract class ToolingSave {
    protected readonly project: Project;
    protected readonly folder: string;
    readonly name: string;
    readonly entity: string;
    errorMessage?: string;
    skip: boolean;
    constructor(project: Project, entity: string);
    abstract getConflictQuery(): Query;
    abstract handleQueryResult(): Promise<void>;
    handleConflictWithServer(serverRecord: ServerFileInformation): Promise<void>;
    handleConflictsMissingFromServer(localState?: FileStatusItem): Promise<void>;
    overwritePrompt(options: ServerFileInformation): Promise<void>;
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
