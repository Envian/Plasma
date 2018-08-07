export declare function authorize(type: ServerType, username?: string): Promise<AuthorizationResult>;
export declare enum ServerType {
    Sandbox = "Sandbox",
    Production = "Production",
    Developer = "Developer",
    Preview = "Preview"
}
export default class AuthView {
    private readonly callback;
    private readonly spinner;
    private readonly element;
    private readonly webview;
    constructor(options: AuthorizationOptions);
    handleResponse(event: NavigateEvent): void;
    serialize(): void;
    destroy(): void;
    getElement(): Element;
    getTitle(): string;
}
interface NavigateEvent extends Event {
    url: string;
}
export interface AuthorizationOptions {
    type: ServerType;
    customURL?: string;
    username?: string;
    callback: (result: AuthorizationResult) => void;
}
export interface AuthorizationResult {
    error?: string;
    instance_url: string;
    id: string;
    token_type: string;
    access_token: string;
    refresh_token: string;
}
export {};
