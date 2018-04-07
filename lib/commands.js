"use babel";

import { File, Directory } from "atom";

import ProjectManager from "./project-manager.js";
import SaveManager from "./saving/save-manager.js";


export default {
    async autoSave(path, body) {
        const project = await ProjectManager.findProject(new File(path));
        if (project) {
            SaveManager.saveFiles(project, [{ path, body }]);
        }
    }
}
