import { IProcessManager } from "../Services/ProcessManager";
import FS from "../Services/FileSystem";
import { FunctionSignature, IDisplayItem } from "../App/libOS";
import { OSApi } from "./Types";
import Identity, { IIdentityContainer, IIdentity } from "./Identity";
import OSLib from "./OSLib";


export interface IProcess {
    id: number;
    exec: string;
    params: string[];
    identity: IIdentity;
    // parent: IProcess | null;
    dead: boolean;
    parentID: number;
}

export default class Process implements IProcess, IIdentityContainer {
    manager: IProcessManager;
    lib: OSLib;
    code: string = "";

    id: number;
    identity: IIdentity;
    params: string[];
    exec: string;
    dead: boolean = false;
    children: { [s: number]: Process } = [];
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
            setEnv: (data: { prop: string, value: any, pid?: number }) => this.setEnv(data.prop, data.value, data.pid),
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

    constructor(manager: IProcessManager, exec: string, pid: number, params: string[], identitC: IIdentity, parent?: Process) {
        this.manager = manager;
        //this.display = display;
        this.exec = exec;
        this.id = pid;
        this.lib = new OSLib((signature: FunctionSignature, data: any) => this.call(signature, data));
        this.identity = identitC.getIdentity();
        this.params = params;
        if (parent instanceof Process) {
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
                    console.log("Process SET", value);
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

    registerChild(process: Process): [Function, Function] {
        this.children[process.id] = process;
        return [
            (data: any) => {
                this.stdIn(process.id, data);
            },
            () => { this.removeChild(process); }
        ];
    }

    removeChild(process: Process): void {
        this.event(["Process", "end"], process.id);
        delete this.children[process.id];
    }

    intoChild(pid: number, source: number | string, data: any): Promise<any> {
        if (this.children.hasOwnProperty(pid)) {
            return this.children[pid].stdIn(source, data);
        }
        return Promise.reject();
    }

    stdIn(source: number | string, data: any): Promise<any> {
        return this.event(["Std", "in"], { from: source, data });
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

