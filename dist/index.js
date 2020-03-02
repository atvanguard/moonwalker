"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var QClient_1 = __importDefault(require("./QClient"));
var Sender_1 = __importDefault(require("./Sender"));
var Worker_1 = __importDefault(require("./Worker"));
exports.default = {
    Worker: Worker_1.default, Sender: Sender_1.default, getQueue: QClient_1.default
};
