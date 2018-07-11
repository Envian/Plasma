"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_1 = require("atom");
const settings_model_js_1 = tslib_1.__importDefault(require("./components/settings-model.js"));
const settings_view_js_1 = tslib_1.__importDefault(require("./components/settings-view.js"));
const auth_view_js_1 = tslib_1.__importDefault(require("./components/auth-view.js"));
const commands_js_1 = tslib_1.__importDefault(require("./commands.js"));
const subscriptions = new atom_1.CompositeDisposable();
subscriptions.add(atom.views.addViewProvider(settings_model_js_1.default, (model) => new settings_view_js_1.default(model).element));
async function activate() {
    subscriptions.add(atom.commands.add("atom-workspace", {
        "plasma:new-project": () => commands_js_1.default.newProject(),
        "plasma:edit-project": () => commands_js_1.default.editProject(),
        "plasma:refresh-from-server": () => commands_js_1.default.refreshFromServer(),
        "plasma:save-to-server": () => commands_js_1.default.saveToServer(),
        "plasma:delete-from-server": () => commands_js_1.default.deleteFromServer(),
        "plasma:open-sfdc": () => commands_js_1.default.openSFDC()
    }));
    subscriptions.add(atom.workspace.addOpener((uri, options) => {
        const [command, ...path] = uri.split("?");
        switch (command) {
            case "plasma://editProject": return new settings_model_js_1.default(path.join(""));
            case "plasma://authenticate": return new auth_view_js_1.default(options);
        }
        return undefined;
    }));
    subscriptions.add(atom.workspace.observeTextEditors(editor => {
        const buffer = editor.getBuffer();
        if (!buffer.plasmaEnabled) {
            buffer.plasmaEnabled = true;
            subscriptions.add(buffer.onDidSave(async (event) => commands_js_1.default.autoSave(event.path, buffer.getText())));
        }
    }));
}
exports.activate = activate;
;
async function deactivate() {
    subscriptions.dispose();
}
exports.deactivate = deactivate;
;
function serialize() {
    return null;
}
exports.serialize = serialize;
;
function deserialize(data) {
    switch (data.deserializer) {
        case "SettingsModel":
            return new settings_model_js_1.default(data.data);
    }
}
exports.deserialize = deserialize;
