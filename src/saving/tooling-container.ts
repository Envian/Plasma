import ToolingSave from './tooling-save';
import ToolingRequest from '../api/tooling/tooling-request';
import { ComponentMessage } from './save-manager';

export default abstract class ToolingContainerSave extends ToolingSave {
    abstract async getSaveRequests(containerName: string): Promise<Array<ToolingRequest<any>>>;
    abstract async handleSaveResult(results: Array<ComponentMessage>): Promise<void>;
}
