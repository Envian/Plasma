import ToolingSave from './tooling-save';
import ToolingRequest from '../api/tooling/tooling-request';
import { ComponentMessage } from './save-manager';
export default abstract class ToolingContainerSave extends ToolingSave {
    abstract getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>>;
    abstract handleSaveResult(results: Array<ComponentMessage>): Promise<void>;
}
