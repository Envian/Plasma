export declare function getLoginPath(username?: string): string;
export declare function refreshToken(host: string, token: string): Promise<RefreshResult>;
export interface RefreshResult {
    instance_url: string;
    token_type: string;
    id: string;
    access_token: string;
}
