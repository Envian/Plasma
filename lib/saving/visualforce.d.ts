import Project from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import ToolingSave, { CompileResult } from "./tooling-save.js";
export default class VisualforceSave extends ToolingSave {
    private type;
    private readonly source;
    private readonly metadata?;
    private readonly query;
    private attributes?;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleConflicts(): Promise<void>;
    getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(results?: Array<CompileResult>): Promise<void>;
}
