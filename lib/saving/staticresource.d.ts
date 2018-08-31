import Project from '../project';
import Query from '../api/tooling/query';
import ToolingRequest from '../api/tooling/tooling-request';
import ToolingStandaloneSave from './tooling-standalone';
import { CompileResult } from './tooling-save';
export default class StaticResource extends ToolingStandaloneSave {
    private readonly path;
    private readonly state?;
    private readonly source?;
    private readonly metadata?;
    private readonly query;
    private saveRequest?;
    constructor(project: Project, entity: string, savedFiles: Array<any>);
    getConflictQuery(): Query;
    handleConflicts(): Promise<void>;
    getSaveRequests(): Promise<Array<ToolingRequest<any>>>;
    handleSaveResult(results?: Array<CompileResult>): Promise<void>;
}
