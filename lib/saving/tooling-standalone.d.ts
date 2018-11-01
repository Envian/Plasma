import ToolingSave from "./tooling-save";
import ToolingRequest from "../api/tooling/tooling-request";
export default abstract class ToolingStandaloneSave extends ToolingSave {
    abstract getSaveRequests(): Promise<Array<ToolingRequest<any>>>;
    abstract handleSaveResult(): Promise<void>;
}
