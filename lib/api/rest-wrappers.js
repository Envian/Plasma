"use babel";

import https from "https";

export default async function(options) {
    return new Promise(resolve => {
        const request = https.request(options);
        request.on("response", conn => {
            let data = "";
            conn.setEncoding("utf8");

            conn.on("data", chunk => data += chunk);
            conn.on("end", () => {
                switch (conn.statusCode) {
                    case 200:
                    case 201:
                        return resolve(JSON.parse(data));
                    case 204:
                        return resolve("");
                    default:
                        return Promise.reject(Error(data));
                }
            });
        });
        request.on("error", error => {
            Promise.reject(error);
        });
        request.end(typeof(options.body) === "string" ? options.body : JSON.stringify(options.body));
    });
}
