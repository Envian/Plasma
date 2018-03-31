"use babel";

import { getLoginPath } from "../api/rest.js";

export default class AuthView {
    // Options:
    //  type: the type of organization (Sandbox or Not-Sandbox)
    //  customURL: for custom login urls.
    //  username: initial username.
    //  callback: A callback to respond to with the authorization response.
    constructor(options) {
        const { customURL, type, callback, username } = options || {};
        const baseURL = customURL || (type === "Sandbox" ? "https://test.salesforce.com" : "https://login.salesforce.com");

        // We are not actually listening on localhost. Instead, we capture the redirect and grab the oauth token off it.
        // Using the User-Agent auth flow prevents the token from leaking into any server that may be listening on
        // localhost.
        this.callback = callback;

        const innerSpinner = document.createElement("div");
        innerSpinner.className = "loader";

        // Someday I'll make this a proper etch component. In the mean time, keep it simple.
        this.spinner = document.createElement("div");
        this.spinner.className = "spinner";
        this.spinner.appendChild(innerSpinner);

        this.webview = document.createElement("webview");
        this.webview.className = "native-key-bindings";
        this.webview.addEventListener("will-navigate", event => this.handleResponse(event.url) );
        this.webview.addEventListener("did-start-loading", event => this.spinner.style.display = "" );
        this.webview.addEventListener("did-frame-finish-load", event => this.spinner.style.display = "none" );
        this.webview.src = baseURL + getLoginPath(username);

        this.element = document.createElement("div");
        this.element.className = "plasma-auth";
        this.element.appendChild(this.spinner);
        this.element.appendChild(this.webview);
    }

    handleResponse(url) {
        if (!url.startsWith("plasma://authenticated")) return;

        // Get the hash if success, search if failure.
        const targetUrl = new URL(url);
        const paramString = (targetUrl.hash || targetUrl.search).substring(1);

        const authParams = paramString.split("&")
            .map(entry => entry.split("=", 2))
            .reduce((map, [key, value]) => {
                map[key] = decodeURIComponent(value);
                return map;
            }, {});

        // Force the pane to close.
        atom.commands.dispatch(this.webview, "core:close");
        this.callback(authParams);
    }

    serialize() {
        // nothing to save.
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
