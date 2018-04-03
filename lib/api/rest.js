"use babel";

import { getLoginPath, refreshToken } from "./rest/login.js";
import getApiVersions from "./rest/api-versions.js";
import getUserInfo from "./rest/user-info.js";

export default {
    getLoginPath,
    refreshToken,
    getApiVersions,
    getUserInfo
}
