import Project from "../project.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import Query from "../api/tooling/query.js";
import ToolingContainerSave from './tooling-container.js';
import { ComponentMessage } from './save-manager.js';
export default class VisualforceSave extends ToolingContainerSave {
    private readonly type;
    private readonly source;
    private metadata?;
    private readonly query;
    private readonly state?;
    private pageId?;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleQueryResult(): Promise<void>;
    getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(results: Array<ComponentMessage>): Promise<void>;
}
