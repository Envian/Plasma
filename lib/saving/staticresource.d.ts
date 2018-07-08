import Project from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import ToolingSave from "./tooling-save.js";
export default class StaticResourceSave extends ToolingSave {
    private readonly path;
    private readonly state?;
    private readonly source?;
    private readonly metadata?;
    private readonly query;
    private saveRequest?;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleConflicts(): Promise<void>;
    getSaveRequest(containerId: string): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(): Promise<void>;
    getBody(url: string): Promise<string>;
}
