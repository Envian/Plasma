import { CompositeDisposable } from "atom";

import SettingsModel from "./components/settings-model.js";
import SettingsView from "./components/settings-view.js";
import AuthView from "./components/auth-view.js";
import Commands from "./commands.js";


// Initialize subscriptions and view providers early.
// This allows windows to restore themselves on load.
const subscriptions = new CompositeDisposable();
subscriptions.add(atom.views.addViewProvider(
    SettingsModel, (model) => new SettingsView(model).element
));

export async function activate() {
    subscriptions.add(
        atom.commands.add("atom-workspace", {
            "plasma:new-project": () => Commands.newProject(),
            "plasma:edit-project": () => Commands.editProject(),
            "plasma:refresh-from-server": () => Commands.refreshFromServer(),
            "plasma:save-to-server": () => Commands.saveToServer(),
            "plasma:delete-from-server": () => Commands.deleteFromServer(),
            "plasma:open-sfdc": () => Commands.openSFDC()
        } as any) // How do i get the typing right?
    );

    subscriptions.add(atom.workspace.addOpener((uri: string, options: any) => {
        const [command, ...path] = uri.split("?")
        switch(command) {
            case "plasma://editProject": return new SettingsModel(path.join(""));
            case "plasma://authenticate": return new AuthView(options); // Options will also contain the auth opts
        }
        return undefined;
    }));


    subscriptions.add(atom.workspace.observeTextEditors(editor => {
        // Simply marking a boolean on the buffer to ensure we don't double save.
        const buffer = editor.getBuffer();
        if (!(buffer as any).plasmaEnabled) {
            (buffer as any).plasmaEnabled = true;
            subscriptions.add(buffer.onDidSave(async event => Commands.autoSave(event.path, buffer.getText())));
        }
    }));
};

export async function deactivate(): Promise<void> {
    subscriptions.dispose();
};

export function serialize(): null {
        // Projects are detected on the fly
        return null;
};

// TODO: Figure out typing
export function deserialize(data: any): any {
    switch (data.deserializer) {
        case "SettingsModel":
            return new SettingsModel(data.data);
    }
}
