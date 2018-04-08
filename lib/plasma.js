"use babel";

import { CompositeDisposable, File, Directory } from "atom";

import SettingsModel from "./components/settings-model.js";
import SettingsView from "./components/settings-view.js";
import AuthView from "./components/auth-view.js";
import { autoSave, refreshFromServer, newProject, editProject } from "./commands.js";


// Initialize subscriptions and view providers early.
const subscriptions = new CompositeDisposable();
subscriptions.add(atom.views.addViewProvider(
    SettingsModel, (model) => new SettingsView(model).element
));

export default {
    activate(state) {
        subscriptions.add(
            atom.commands.add("atom-workspace", {
                "plasma:new-project": event => newProject(event),
                "plasma:edit-project": event => editProject(event),
                "plasma:refresh-from-server": event => refreshFromServer(event),
                "plasma:save-to-server": event => null // TODO: Save things
            })
        );

        subscriptions.add(atom.workspace.addOpener((uri, options) => {
            switch(uri) {
                case "plasma://editProject": return new SettingsModel(options);
                case "plasma://authenticate": return new AuthView(options);
            }
        }));


        subscriptions.add(atom.workspace.observeTextEditors(editor => {
            const buffer = editor.getBuffer();
            if (!buffer.plasmaEnabled) {
                buffer.plasmaEnabled = true;
                subscriptions.add(buffer.onDidSave(async event => autoSave(event.path, buffer.getText())));
            }
        }));
    },

    deactivate() {
        subscriptions.dispose();
    },

    serialize() {
        // Projects are detected on the fly
    },

    deserialize(data) {
        switch (data.deserializer) {
            case "SettingsModel":
                return new SettingsModel(data.data);
        }
    }
};
