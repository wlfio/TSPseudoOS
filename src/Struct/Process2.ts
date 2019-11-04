import { IDisplay } from "../Services/Display";
import { IProcessManager } from "../Services/ProcessManager";
import FS from "../Services/FileSystem";
import { IProcess } from "./Process";
import { FunctionSignature, IDisplayItem, ILibOS, ILibFS, ILibStd, ILibProcess, IStdInMsg } from "../App/libOS";
import { OSApi, FunctionSet, PromiseHolder, AppMessage, AppMessageType } from "./Types";
import Identity, { IIdentityContainer, IIdentity } from "./Identity";

class OSLib implements ILibOS {

    private _call: (signature: FunctionSignature, data: any) => Promise<any>;
    private hooks: { [s: string]: Function } = {};
    private awaitProcs: { [s: number]: PromiseHolder } = {};
    private responses: { [s: string]: PromiseHolder } = {};

    Std: ILibStd = {
        event: {
            in: (cb: (msg: IStdInMsg) => void) => this.hookEvent("Std", "in", cb),
        },
        out: (data: any) => this.call("Std", "out", data),
        in: (pid: number, data: any, source?: string | number) => this.call("Std", "in", { pid, data, source }),
    };
    FS: ILibFS = {
        list: (path: string) => this.call("FS", "list", path),
        mkdir: (path: string) => this.call("FS", "mkdir", path),
        resolve: (paths: string[]) => this.call("FS", "resolve", paths),
        append: (path: string, content: string) => this.call("FS", "append", { path, content }),
        write: (path: string, content: string) => this.call("FS", "write", { path, content }),
        touch: (path: string) => this.call("FS", "touch", path),
        read: (path: string) => this.call("FS", "read", path),
        del: (path: string) => this.call("FS", "del", path),
        dirExists: (path: string) => this.call("FS", "dirExists", path),
        fileExists: (path: string) => this.call("FS", "fileExists", path),
        delDir: (path: string) => this.call("FS", "delDir", path),
    };
    Process: ILibProcess = {
        event: {
            start: (cb: Function) => this.hookEvent("Process", "start", cb),
            msg: (cb: Function) => this.hookEvent("Process", "msg", cb),
            end: (cb: Function) => this.hookEvent("Process", "end", cb),
            self: (cb: Function) => this.hookEvent("Process", "self", cb),
        },
        end: () => this.call("Process", "end"),
        //setSelf: (prop: string, value: any) => this.call("Process", "setSelf", { prop, value }),
        self: () => this.call("Process", "self"),
        start: (exec: string, params: string[]) => this.call("Process", "start", { exec, params }),
        crash: (error: any) => this.call("Process", "crash", error),
        changeWorkingPath: (path: string) => this.call("Process", "changeWorkingPath", path),
        msg: (pid: number, msg: any) => this.call("Process", "msg", { pid, msg }),
        kill: (pid: number) => this.call("Process", "kill", pid),
        list: () => this.call("Process", "list"),
        startAndAwaitOutput: (exec: string, params: string[]) => this.startAndAwait(exec, params),
    };
    Display: FunctionSet = {
        // @ts-ignore
        prompt: (text: string) => this.display.setText(text),
        // @ts-ignore
        print: (item: IDisplayItem) => this.display.output(item.data, item.over, false),
        // @ts-ignore
        printLn: (item: IDisplayItem) => this.display.output(item.data, item.over, true),
        info: () => this.display !== null ? this.display.info() : Promise.reject(new Error("PM Error : missing display : ...")),
    };

    constructor(call: (signature: FunctionSignature, data: any) => Promise<any>) {
        this._call = call;
    }

    private call(service: string, func: string, data?: any): Promise<any> {
        return this._call({ service: service, func: func }, data);
    }

    private hookEvent(service: string, func: string, cb: Function): void {
        const event: string = service + ":" + func;
        this.hooks[event] = cb;
    }

    private startAndAwait(exec: string, params: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.Process.start(exec, params)
                .then((proc: IProcess) => {
                    this.awaitProcs[proc.id] = {
                        resolve: resolve,
                        reject: reject,
                    };
                })
                .catch(e => reject(e));
        });
    }

    fireEvent(signature: FunctionSignature, data: any): Promise<any> {
        return this.fireHooks(signature, data);
    }

    private awaitIn(msg: IStdInMsg): boolean {
        if (typeof msg.from === "number" && this.awaitProcs.hasOwnProperty(msg.from)) {
            this.awaitProcs[msg.from].resolve(msg);
            delete this.awaitProcs[msg.from];
            return true;
        }
        return false;
    }

    private fireHooks(signature: FunctionSignature, data: any): Promise<any> {
        const event: string = signature.service + ":" + signature.func;
        if (event === "Std:in") {
            if (this.awaitIn(data)) {
                return Promise.resolve();
            }
        }
        if (this.hooks.hasOwnProperty(event)) {
            return this.hooks[event](data);
        }
        return Promise.reject("MISSING")
    }
}

export default class Process2 implements IProcess, IIdentityContainer {
    manager: IProcessManager;
    lib: OSLib;
    code: string = "";

    id: number;
    identity: IIdentity;
    params: string[];
    exec: string;
    dead: boolean = false;
    children: { [s: number]: Process2 } = [];
    app: any;

    parentInCB: Function | null = null;
    parentEndCB: Function | null = null;
    parentID: number = -1;

    private api: OSApi = {
        Std: {
            out: (data: any) => this.hasParent() ? this.intoParent(data) : this.api.Display.print({ data: data, over: 0 }),
            in: (data: any) => this.intoChild(data.pid, data.data, data.source || null),
        },
        FS: {
            list: (data: string) => FS.list(data, this),
            mkdir: (data: string) => FS.mkdir(data, this),
            resolve: (data: string[]) => FS.resolveWorkingPaths(data, this),
            append: (data: { path: string, content: string }) => FS.append(data.path, data.content, this),
            write: (data: { path: string, content: string }) => FS.write(data.path, data.content, this),
            touch: (path: string) => FS.touch(path, this),
            read: (path: string) => FS.read(path, this),
            del: (path: string) => FS.del(path, this),
            dirExists: (path: string) => FS.dirExists(path, this),
            fileExists: (path: string) => FS.fileExists(path, this),
            delDir: (path: string) => FS.delDir(path, this),
        },
        Process: {
            end: () => this.kill(),
            setEnv: (data: { prop: string, value: any, pid?: number }) => this.setEnv(data.prop, data.value, data.pid || null),
            self: () => Promise.resolve(this.data()),
            start: (data: any) => this.manager.startProcess(data.exec, data.params, null, this),
            crash: (error: any) => { this.api.Std.out(error); return this.kill(); },
            changeWorkingPath: (data: any) => this.changeWorkingPath(data),
        },
        Display: {
            prompt: (text: string) => this.manager.getDisplay().setText(text),
            print: (item: IDisplayItem) => this.manager.getDisplay().output(item.data, item.over, false),
            printLn: (item: IDisplayItem) => this.manager.getDisplay().output(item.data, item.over, true),
            info: () => this.manager.getDisplay().info(),
        }
    };

    getIdentity(): IIdentity {
        if (this.identity instanceof Identity) {
            return this.identity.getIdentity();
        } else {
            return this.identity;
        }
    }

    constructor(manager: IProcessManager, exec: string, pid: number, params: string[], identitC: IIdentity, parent?: Process2) {
        this.manager = manager;
        //this.display = display;
        this.exec = exec;
        this.id = pid;
        this.lib = new OSLib((signature: FunctionSignature, data: any) => this.call(signature, data));
        this.identity = identitC.getIdentity();
        this.params = params;
        if (parent instanceof Process2) {
            this.parentID = parent.id;
            const cbs: [Function, Function] = parent.registerChild(this);
            this.parentInCB = cbs[0];
            this.parentEndCB = cbs[1];
        }
    }

    setEnv(prop: string, value: any, pid?: number): Promise<any> {
        if (typeof pid === "number") {
            if (pid === this.parentID || this.children.hasOwnProperty(pid)) {
                return this.manager.setEnv(pid, prop, value);
            } else {
                return Promise.reject();
            }
        } else {
            switch (prop) {
                case "log":
                    console.log("PROCESS2 SET", value);
                    break;
                case "workingPath":
                case "workingDir":
                    this.changeWorkingPath(value);
                    break;
                default:
                    this.identity.setEnv(prop, value);
                    break;
            }
            this.event(["Process", "self"], this.data());
            return Promise.resolve();
        }
    }

    start(code: string): boolean {
        this.code = code;
        const wrapper: string = [
            "((proc,osLib)=>{\n",
            this.code,
            ";\nreturn new Main(proc,osLib);\n})"
        ].join("");

        // tslint:disable: no-eval
        this.app = eval(wrapper)(this.data, this.lib);
        // tslint:enable: no-eval
        return true;
    }

    hasParent(): boolean {
        return this.parentID >= 0;
    }

    private intoParent(data: any): Promise<any> {
        if (this.parentInCB !== null) {
            this.parentInCB(data);
            return Promise.resolve();
        }
        return Promise.reject();
    }

    call(signature: FunctionSignature, data: any): Promise<any> {
        if (this.api.hasOwnProperty(signature.service)) {
            if (this.api[signature.service].hasOwnProperty(signature.func)) {
                return this.api[signature.service][signature.func](data);
            }
        }
        return Promise.reject(
            new Error([
                "PM Error",
                "Atempt to access non-existant System Call\n" + signature.service + ">" + signature.func,
                this.exec + "[" + this.id + "]"
            ].join(" : "))
        );
    }

    data(): IProcess {
        return {
            id: this.id,
            exec: this.exec,
            params: [... this.params],
            identity: this.identity,
            dead: this.dead,
            parentID: this.parentID,
        };
    }

    registerChild(process: Process2): [Function, Function] {
        this.children[process.id] = process;
        return [
            (data: any) => {
                this.stdIn(process.id, data);
            },
            () => { this.removeChild(process); }
        ];
    }

    removeChild(process: Process2): void {
        this.event(["Process", "end"], process.id);
        delete this.children[process.id];
    }


    stdIn(source: number | string, data: any): void {
        this.event(["Std", "in"], { from: source, data });
    }

    async changeWorkingPath(path: string): Promise<any> {
        this.identity.changeWorkingPath(path);
    }

    event(type: [string, string], data: any): Promise<any> {
        return this.lib.fireEvent({ service: type[0], func: type[1] }, data);
    }

    kill(): Promise<any> {
        this.dead = true;
        delete this.app;
        delete this.lib;
        if (this.parentEndCB !== null) {
            this.parentEndCB();
        }
        return Promise.resolve();
    }
}

