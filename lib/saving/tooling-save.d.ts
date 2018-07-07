import Project, { FileStatusItem } from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import FileInfo from './file-info.js';
export default abstract class ToolingSave {
    protected readonly project: Project;
    protected readonly path: string;
    protected readonly entity: string;
    protected readonly name: string;
    protected readonly folder: string;
    protected readonly state?: FileStatusItem;
    protected readonly files: Array<FileInfo>;
    skip: boolean;
    success: boolean;
    constructor(project: Project, entity: string, path: string, savedFiles: Array<FileInfo>);
    abstract getConflictQuery(): Query;
    abstract handleConflicts(): Promise<void>;
    abstract getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>>;
    abstract handleSaveResult(results?: Array<CompileResult>): Promise<void>;
    handleConflictWithServer(serverRecord: ServerFileInformation): Promise<void>;
    handleConflictsMissingFromServer(localState?: FileStatusItem): Promise<void>;
    overwritePrompt(options: ServerFileInformation): Promise<void>;
    getBody(body: string): Promise<string>;
}
export interface CompileResult {
    fileName: string;
    id: string;
    createdDate: string;
    componentType: string;
    lineNumber: number;
    success: boolean;
    problem: string;
}
export interface ServerFileInformation {
    modifiedBy: string;
    modifiedDate: string;
    id: string;
    type: string;
    body: string;
    path: string;
    name: string;
    localState?: FileStatusItem;
}
