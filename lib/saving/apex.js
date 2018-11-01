"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tooling_container_js_1 = tslib_1.__importDefault(require("./tooling-container.js"));
class ApexSave extends tooling_container_js_1.default {
    constructor(project, entity, savedFiles) {
        super(project, entity, savedFiles, "body");
    }
    getDefaultMetadata() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<${this.type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${this.project.apiVersion}</apiVersion>
    <status>Active</status>
</${this.type}>`;
    }
}
exports.default = ApexSave;
