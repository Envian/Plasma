import Project from "../project";
import Query from "../api/tooling/query";
import ToolingRequest from "../api/tooling/tooling-request";
import ToolingStandaloneSave from "./tooling-standalone";
export default class Aura extends ToolingStandaloneSave {
    private metadata?;
    readonly query: Query;
    private readonly savesByType;
    private bundleId?;
    private readonly files;
    private readonly existingIdsByType;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleQueryResult(): Promise<void>;
    getSaveRequests(): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(): Promise<void>;
}
