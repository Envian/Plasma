"use babel";

import EventEmitter from "events";

export default class SoapRequest extends EventEmitter {
    constructor(options, body) {
        this.options = options;
        this.body = body;
    }

    send(project) {
        const options = await this.options;
        if (project) {
            options.headers = options.headers || {};
            options.headers.Authorization = await project.getOauth();
        }

        try {
            const result = await sendWithReauthenticate(project, options, await this.body);
            this.emit("response", result);
            return JSON.parse(result);
        } catch (error) {
            this.emit("error", error);
            throw error;
        }
    }
}
