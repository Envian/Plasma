"use babel";

import { CompositeDisposable, File, Directory } from "atom";

import SettingsModel from "./components/settings-model.js";
import SettingsView from "./components/settings-view.js";
import AuthView from "./components/auth-view.js";
import ProjectManager from "./project-manager.js";
import SaveManager from "./save-manager.js";


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
                "plasma:save-to-server": event => SaveManager.saveFile(event)
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
                subscriptions.add(buffer.onDidSave(event => SaveManager.autoSaveFile(event.path, buffer.getText())));
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

function getTargetFile(event) {
    const target = event.target.nodeName === "LI" ? event.target.lastChild : event.target;
    return target.dataset.path || "";
}

async function newProject(event) {
    let path = getTargetFile(event);
    if (path) {
        const project = await ProjectManager.findProject(path);
        if (project) path = ""; // don't new project over an existing one
    }

    // Predict the root directory
    if (path) {
        let dir = new Directory(path);
        while (!dir.isRoot()) {
            if (dir.getBaseName() === "src") {
                path = dir.getParent().getPath();
                break;
            }
            dir = dir.getParent();
        }
    }

    atom.workspace.open("plasma://editProject", path);
}

async function editProject(event) {
    const editor = atom.workspace.getActiveTextEditor();
    const path = getTargetFile(event) || (editor && editor.getPath());

    if (path) {
        const project = await ProjectManager.findProject(path);
        if (project) {
            atom.workspace.open("plasma://editProject", project);
        } else {
            atom.notifications.addError("No project found.");
        }
    } else {
        atom.notifications.addError("No active project to open.");
    }
}

async function refreshFromServer(event) {
    const editor = atom.workspace.getActiveTextEditor();
    const path = getTargetFile(event) || (editor && editor.getPath());
    const project = await ProjectManager.findProject(path);
    if (project) return project.refreshFromServer();
    else atom.notifications.addError("No project found.");
}
