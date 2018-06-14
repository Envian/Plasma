"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const login_js_1 = require("../api/rest/login.js");
async function authorize(type, username) {
    return new Promise(accept => {
        atom.workspace.open("plasma://authenticate", {
            type: type,
            username: username,
            callback: accept
        });
    });
}
exports.authorize = authorize;
var ServerType;
(function (ServerType) {
    ServerType["Sandbox"] = "Sandbox";
    ServerType["Production"] = "Production";
    ServerType["Developer"] = "Developer";
    ServerType["Preview"] = "Preview";
})(ServerType = exports.ServerType || (exports.ServerType = {}));
class AuthView {
    constructor(options) {
        const baseURL = options.customURL || (options.type === ServerType.Sandbox ? "https://test.salesforce.com" : "https://login.salesforce.com");
        this.callback = options.callback;
        const innerSpinner = document.createElement("div");
        innerSpinner.className = "loader";
        this.spinner = document.createElement("div");
        this.spinner.className = "spinner";
        this.spinner.appendChild(innerSpinner);
        this.webview = document.createElement("webview");
        this.webview.className = "native-key-bindings";
        this.webview.addEventListener("will-navigate", (event) => this.handleResponse(event.url));
        this.webview.addEventListener("did-start-loading", () => this.spinner.style.display = "");
        this.webview.addEventListener("did-frame-finish-load", () => this.spinner.style.display = "none");
        this.webview.setAttribute("src", baseURL + login_js_1.getLoginPath(options.username));
        this.element = document.createElement("div");
        this.element.className = "plasma-auth";
        this.element.appendChild(this.spinner);
        this.element.appendChild(this.webview);
    }
    handleResponse(url) {
        if (!url.startsWith("plasma://authenticated"))
            return;
        const targetUrl = new URL(url);
        const paramString = (targetUrl.hash || targetUrl.search).substring(1);
        const authParams = paramString.split("&")
            .map(entry => entry.split("=", 2))
            .reduce((map, [key, value]) => {
            map[key] = decodeURIComponent(value);
            return map;
        }, {});
        atom.commands.dispatch(this.webview, "core:close");
        this.callback(authParams);
    }
    serialize() {
    }
    destroy() {
        this.element.remove();
    }
    getElement() {
        return this.element;
    }
    getTitle() {
        return "Salesforce Authentication";
    }
}
exports.default = AuthView;
