export default function (id: string, token: string): Promise<UserInfoResult>;
export interface UserInfoResult {
    username: string;
    user_id: string;
}
