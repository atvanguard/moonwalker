"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Web3Client_1 = __importDefault(require("./Web3Client"));
var fs_1 = __importDefault(require("fs"));
var Worker = /** @class */ (function () {
    function Worker(provider, QClient, options, buildFolder, blockConfirmation) {
        this.queue = QClient;
        this.web3Client = new Web3Client_1.default(provider, options);
        this.buildFolder = buildFolder;
        this.artifactsDir = buildFolder + "/contracts";
        this.blockConfirmation = blockConfirmation;
    }
    Worker.prototype.start = function (q) {
        var _this = this;
        this.queue.consume(q, function (msg) { return __awaiter(_this, void 0, void 0, function () {
            var job, status, receipt_1, receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        job = JSON.parse(msg.content.toString());
                        console.log("[x] Received %s", job.contract);
                        status = this._getJobStatus(job.id);
                        if (!(status == 'progress')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.waitForConfirmation(job.id)];
                    case 1:
                        receipt_1 = _a.sent();
                        this._onJobCompletion(job, receipt_1);
                        return [2 /*return*/, this.queue.channel.ack(msg)];
                    case 2:
                        if (status == 'complete') {
                            return [2 /*return*/, this.queue.channel.ack(msg)];
                        }
                        _a.label = 3;
                    case 3:
                        if (!(job.type == 'deploy')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.handleDeploy(job)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 5:
                        if (!(job.type == 'transaction')) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.handleTransaction(job)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 7:
                        if (!(job.type == 'end')) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.handleEnd(msg)];
                    case 8:
                        _a.sent();
                        return [2 /*return*/];
                    case 9: throw new Error('job type not recognised');
                    case 10: 
                    // wait for tx confirmation before consuming new messages
                    return [4 /*yield*/, Worker.delay(2)]; // this is required bcoz polling the tx too soon fucks up ganache response
                    case 11:
                        // wait for tx confirmation before consuming new messages
                        _a.sent(); // this is required bcoz polling the tx too soon fucks up ganache response
                        return [4 /*yield*/, this.waitForConfirmation(job.id)];
                    case 12:
                        receipt = _a.sent();
                        this._onJobCompletion(job, receipt);
                        this.queue.channel.ack(msg);
                        return [2 /*return*/];
                }
            });
        }); }, {});
    };
    Worker.prototype._getJobStatus = function (jobId) {
        var status = this._getStatus();
        var job = status[jobId];
        return job ? job.status : 'process';
    };
    Worker.prototype._onJobCompletion = function (job, receipt) {
        console.log("job " + job.id + " completed");
        var status = this._getStatus();
        if (receipt.status == false) {
            status[job.id].status = 'reverted';
            this._writeStatusToFile(status);
            throw new Error("reverted: " + JSON.stringify(receipt, null, 2));
        }
        if (job.type == 'deploy') {
            status[job.id].address = receipt.contractAddress;
        }
        else if (job.type == 'transaction') {
            // status[job.id].events = receipt.events
        }
        else {
            throw new Error('job type not recognized');
        }
        status[job.id].status = 'complete';
        this._writeStatusToFile(status);
    };
    Worker.prototype.handleEnd = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('finished, closing connection now ...');
                        this.queue.channel.ack(msg);
                        return [4 /*yield*/, Worker.delay(2)]; // if closed too soon, msg doesnt get acked
                    case 1:
                        _a.sent(); // if closed too soon, msg doesnt get acked
                        this.queue.channel.close();
                        process.exit(0);
                        return [2 /*return*/];
                }
            });
        });
    };
    Worker.prototype.handleTransaction = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var artifact, address, txHash, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        artifact = this._getArtifact(job.contract);
                        address = this._getAddressForContract(job.addressArtifact || job.contract);
                        console.log('job.contract', job.contract, 'address', address);
                        return [4 /*yield*/, this.web3Client.transaction(artifact.abi, address, job.method, this._processArgs(job.args))];
                    case 1:
                        txHash = _a.sent();
                        status = this._getStatus();
                        status[job.id] = __assign(__assign({}, job), { txHash: txHash, status: 'progress' });
                        console.log(status);
                        this._writeStatusToFile(status);
                        return [2 /*return*/];
                }
            });
        });
    };
    Worker.prototype.handleDeploy = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var artifact, txHash, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        artifact = this._getArtifact(job.contract);
                        artifact.bytecode = this.linkBytecode(artifact.bytecode);
                        if (!Worker.validateBytecode(artifact.bytecode)) {
                            console.log('Invalid bytecode for', job.contract);
                            throw new Error('Invalid bytecode');
                        }
                        job.args = this._processArgs(job.args);
                        return [4 /*yield*/, this.web3Client.deploy(artifact.abi, artifact.bytecode, job.args)];
                    case 1:
                        txHash = _a.sent();
                        console.log('txHash for', job, 'is', txHash);
                        status = this._getStatus();
                        status[job.id] = __assign(__assign({}, job), { txHash: txHash, status: 'progress' });
                        console.log(status);
                        this._writeStatusToFile(status);
                        return [2 /*return*/];
                }
            });
        });
    };
    Worker.prototype.waitForConfirmation = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var status, job, txHash, receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        status = this._getStatus();
                        job = status[jobId];
                        txHash = job.txHash;
                        console.log('waiting for job', job, 'to get confirmed');
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.web3Client.isConfirmed(txHash, this.blockConfirmation)];
                    case 2:
                        if (!_a.sent()) return [3 /*break*/, 4];
                        console.log(txHash, 'confirmed');
                        return [4 /*yield*/, this.web3Client.web3.eth.getTransactionReceipt(txHash)
                            // on görli, retrieving the receipt too soon returns null sometimes
                        ];
                    case 3:
                        receipt = _a.sent();
                        // on görli, retrieving the receipt too soon returns null sometimes
                        if (receipt != null)
                            return [2 /*return*/, receipt];
                        _a.label = 4;
                    case 4: return [4 /*yield*/, Worker.delay(5)]; // something like blockConfirmation * blockTime
                    case 5:
                        _a.sent(); // something like blockConfirmation * blockTime
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Worker.prototype._getStatus = function () {
        var status = {};
        var statusFile = this.buildFolder + "/status.json";
        if (fs_1.default.existsSync(statusFile)) {
            try {
                status = JSON.parse(fs_1.default.readFileSync(statusFile).toString());
            }
            catch (e) {
                console.log(e);
            }
        }
        return status;
    };
    Worker.prototype._writeStatusToFile = function (status) {
        var statusFile = this.buildFolder + "/status.json";
        fs_1.default.writeFileSync(statusFile, JSON.stringify(status, null, 2)); // Indent 2 spaces
    };
    Worker.prototype._getArtifact = function (contract) {
        return JSON.parse(fs_1.default.readFileSync(this.artifactsDir + "/" + contract + ".json").toString());
    };
    Worker.delay = function (s) {
        console.log('sleeping for', s, 'secs...');
        return new Promise(function (resolve) { return setTimeout(resolve, s * 1000); });
    };
    Worker.validateBytecode = function (bytecode) {
        var regex = RegExp('0[xX][0-9a-fA-F]+');
        return regex.test(bytecode);
    };
    Worker.prototype.linkBytecode = function (bytecode) {
        var index = bytecode.indexOf('__');
        while (index > -1) {
            var lib = bytecode.slice(index, index + 40).slice(2);
            lib = lib.slice(0, lib.indexOf('_'));
            var libAddress = this._getAddressForContract(lib);
            console.log('replacing', lib, 'with', libAddress);
            bytecode = bytecode.replace("__" + lib + '_'.repeat(40 - (lib.length + 2)), libAddress.slice(2));
            index = bytecode.indexOf('__');
        }
        return bytecode;
    };
    Worker.prototype._getAddressForContract = function (contract) {
        var status = this._getStatus();
        for (var i = 0; i < Object.keys(status).length; i++) {
            if (status[i].contract === contract)
                return status[i].address;
        }
        throw new Error(contract + " not found in status file");
    };
    Worker.prototype._processArgs = function (args) {
        var _this = this;
        // console.log('args', args)
        return args.map(function (arg) {
            return (arg.value || _this._getAddressForContract(arg));
        });
    };
    return Worker;
}());
exports.default = Worker;
