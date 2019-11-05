import { ILibOS, ILibStd, ILibFS, IStdInMsg, ILibProcess, ILibDisplay, ILibUtil } from "../App/libOS";
import { FunctionSignature, PromiseHolder } from "./Types";
import { IProcess } from "./Process";
import Util from "./Util";

export default class OSLib implements ILibOS {

    private _call: (signature: FunctionSignature, data: any) => Promise<any>;
    private hooks: { [s: string]: Function } = {};
    private awaitProcs: { [s: number]: PromiseHolder } = {};

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
    Display: ILibDisplay = {
        prompt: (text: string) => this.call("Display", "prompt", text),
        printRaw: (data: string | String[] | Array<string[]>, over: number, newLine: boolean) => this.call("Display", "print", { data: data, over: over || 0, newLine: newLine === true }),
        print: (data: string | String[] | Array<string[]>, over?: number) => this.Display.printRaw(data, over, false),
        printLn: (data: string | String[] | Array<string[]>, over?: number) => this.Display.printRaw(data, over, true),
        info: () => this.call("Display", "info"),
    };

    Util: ILibUtil = Util;

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