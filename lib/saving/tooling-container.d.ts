import ToolingSave from "./tooling-save";
import ToolingRequest from "../api/tooling/tooling-request";
import { ComponentMessage } from "./save-manager";
import FileInfo from "./file-info";
import Project, { FileStatusItem } from "../project.js";
import Query from "../api/tooling/query";
export default abstract class ToolingContainerSave extends ToolingSave {
    protected readonly type: string;
    protected readonly source: FileInfo;
    protected readonly metadata: FileInfo;
    private readonly query;
    private readonly bodyField;
    protected readonly state?: FileStatusItem;
    protected memberId?: string;
    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>, bodyField: string);
    getConflictQuery(): Query;
    handleQueryResult(): Promise<void>;
    getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(results: Array<ComponentMessage>): Promise<void>;
    abstract getDefaultMetadata(): any;
}
