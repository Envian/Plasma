"use babel";

import { WorkspaceOpenOptions } from "atom";

import { getLoginPath } from "../api/rest/login.js";

export async function authorize(type: ServerType, username?: string): Promise<AuthorizationResult> {
    return new Promise<AuthorizationResult>(accept => {
        atom.workspace.open("plasma://authenticate", {
            type: type,
            username: username,
            callback: accept
        } as WorkspaceOpenOptions);
    });
}

export enum ServerType {
    Sandbox = "Sandbox",
    Production = "Production",
    Developer = "Developer",
    Preview = "Preview"
}

export default class AuthView {
    private readonly callback: (result: AuthorizationResult) => void;
    private readonly spinner: HTMLDivElement;
    private readonly element: HTMLDivElement;
    private readonly webview: Element;

    constructor(options: AuthorizationOptions) {
        const baseURL = options.customURL || (options.type === ServerType.Sandbox ? "https://test.salesforce.com" : "https://login.salesforce.com");

        // We are not actually listening on localhost. Instead, we capture the redirect and grab the oauth token off it.
        // Using the User-Agent auth flow prevents the token from leaking into any server that may be listening on
        // localhost.
        this.callback = options.callback;

        const innerSpinner = document.createElement("div");
        innerSpinner.className = "loader";

        // Someday I'll make this a proper etch component. In the mean time, keep it simple.
        this.spinner = document.createElement("div");
        this.spinner.className = "spinner";
        this.spinner.appendChild(innerSpinner);

        this.webview = document.createElement("webview");
        this.webview.className = "native-key-bindings";
        this.webview.addEventListener("will-navigate", (event: any) => this.handleResponse(event.url) );
        this.webview.addEventListener("did-start-loading", () => this.spinner.style.display = "" );
        this.webview.addEventListener("did-frame-finish-load", () => this.spinner.style.display = "none" );
        this.webview.setAttribute("src", baseURL + getLoginPath(options.username));

        this.element = document.createElement("div");
        this.element.className = "plasma-auth";
        this.element.appendChild(this.spinner);
        this.element.appendChild(this.webview);
    }

    handleResponse(url: string): void {
        if (!url.startsWith("plasma://authenticated")) return;

        // Get the hash if success, search if failure.
        const targetUrl = new URL(url);
        const paramString = (targetUrl.hash || targetUrl.search).substring(1);

        const authParams = paramString.split("&")
            .map(entry => entry.split("=", 2))
            .reduce((map: any, [key, value]) => {
                map[key] = decodeURIComponent(value);
                return map;
            }, {});

        // Force the pane to close.
        atom.commands.dispatch(this.webview, "core:close");
        this.callback(authParams as AuthorizationResult);
    }

    serialize(): void {
        // nothing to save.
    }

    destroy(): void {
        this.element.remove();
    }

    getElement(): Element {
        return this.element;
    }

    getTitle(): string {
        return "Salesforce Authentication";
    }
}

export interface AuthorizationOptions {
    type: ServerType,
    customURL?: string,
    username?: string,
    callback: (result: AuthorizationResult) => void
}

export interface AuthorizationResult {
    error?: string
    instance_url: string
    id: string
    token_type: string
    access_token: string
    refresh_token: string
}
