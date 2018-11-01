import Project from '../project';
import Query from '../api/tooling/query';
import ToolingRequest from '../api/tooling/tooling-request';
import ToolingStandaloneSave from './tooling-standalone';
export default class StaticResource extends ToolingStandaloneSave {
    private readonly state?;
    private readonly source;
    private readonly metadata;
    private readonly query;
    private saveRequest?;
    private resourceId?;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleQueryResult(): Promise<void>;
    getSaveRequests(): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(): Promise<void>;
}
