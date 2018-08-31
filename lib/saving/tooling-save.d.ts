import Project, { FileStatusItem } from "../project.js";
import Query from "../api/tooling/query.js";
import FileInfo from './file-info.js';
export default abstract class ToolingSave {
    protected readonly project: Project;
    protected readonly entity: string;
    protected readonly name: string;
    protected readonly folder: string;
    protected readonly files: Array<FileInfo>;
    errorMessage?: string;
    skip: boolean;
    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>);
    abstract getConflictQuery(): Query;
    abstract handleConflicts(): Promise<void>;
    handleConflictWithServer(serverRecord: ServerFileInformation): Promise<void>;
    handleConflictsMissingFromServer(localState?: FileStatusItem): Promise<void>;
    overwritePrompt(options: ServerFileInformation): Promise<void>;
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
    body: string | (() => Promise<string>);
    path: string;
    name: string;
    localState?: FileStatusItem;
}
