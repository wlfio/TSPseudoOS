import uuid from "uuid";
import { IAppMessage, IAppMessageType, ILibOS, IStdInMsg } from "./libOS";
import { Util } from "./Util";
import CMD from "../Services/Cmd";
import { IProcess } from "../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

var ogLog = console.log;
console.log = (...args: any[]) => {
    ogLog(PROCESS.exec + "[" + PROCESS.id + "]", ...args);
}

// @ts-ignore
delete window.localStorage;
// @ts-ignore
delete window.sessionStorage;

const hooks: { [s: string]: Array<Function> } = {};
const calls: { [s: string]: IPromiseHolder } = {};

interface IPromiseHolder {
    resolve(data: any): void;
    reject(error: any): void;
}

const msg: Function = (typea: string[], data?: any, id?: string) => {
    const type: IAppMessageType = { service: typea[0], func: typea[1] };
    window.parent.postMessage({ type: type, data: data, id: id }, location.origin);
};

const fireHooks: Function = (type: IAppMessageType, data?: any, id?: string) => {
    if (typeof type !== "object") { return; }
    const event: string = type.service + ":" + type.func;
    if (hooks.hasOwnProperty(event)) {
        const wantsPromise: boolean = (typeof id === "string" && id.length > 0);
        hooks[event].forEach(hook => {
            const p: Function = hook(data);
            if (wantsPromise) {
                if (p instanceof Promise) {
                    p.then(data => msg(["response"], data, id));
                } else {
                    OS.Process.crash(["Hook ERROR", type, "Did not return Promise"]);
                }
            }
        });
    }
};

const response: Function = (message: MessageEvent) => {
    const msg: IAppMessage = message.data;
    const type: IAppMessageType = msg.type;
    if (type.service === "response" && msg.id) {
        if (calls.hasOwnProperty(msg.id)) {
            const prom: IPromiseHolder = calls[msg.id];
            if (msg.hasOwnProperty("error")) {
                prom.reject(msg.error);
            } else {
                prom.resolve(msg.data);
            }
            delete calls[msg.id];
        }
    } else {
        fireHooks(type, msg.data, msg.id);
    }
};

const request: Function = (type: string[], data?: any): Promise<any> => {
    const id: string = uuid.v4();
    return new Promise((resolve, reject) => {
        calls[id] = { resolve: resolve, reject: reject };
        msg(type, data, id);
    });
};


// @ts-ignore
window.addEventListener("message", response);

const hookEvent: Function = (type: IAppMessageType | [string, string], cb: Function) => {
    const event: string = (type instanceof Array) ? type.join(":") : type.service + ":" + type.func;
    if (!hooks.hasOwnProperty(event)) {
        hooks[event] = [];
    }
    hooks[event] = [...hooks[event], cb];
};

const awaitProcs: { [s: number]: IPromiseHolder } = {};

const startAndAwait: Function = (exec: string, params: string[]) => {
    return new Promise((resolve, reject) => {
        OS.Process.start(exec, params)
            .then((proc: IProcess) => {
                awaitProcs[proc.id] = {
                    resolve: resolve,
                    reject: reject,
                };
            })
            .catch(e => reject(e));
    });
};

const awaitIn: (msg: IStdInMsg) => void = (msg: IStdInMsg): void => {
    if (awaitProcs.hasOwnProperty(msg.from) && typeof msg.from === "number") {
        awaitProcs[msg.from].resolve(msg);
    }
};

const libJSPseudoOS: ILibOS = {
    FS: {
        read: (path: string) => request(["FS", "read"], path),
        write: (path: string, content: string) => request(["FS", "write"], { path: path, content: content }),
        list: (path: string) => request(["FS", "list"], path),
        mkdir: (path: string) => request(["FS", "mkdir"], path),
        touch: (path: string) => request(["FS", "touch"], path),
        del: (path: string) => request(["FS", "del"], path),
        resolve: (paths: string[]) => request(["FS", "resolve"], paths),
        append: (path: string, content: string) => request(["FS", "append"], { path: path, content: content }),
    },
    Std: {
        out: (data: any) => msg(["Std", "out"], data),
        inEvent: (cb: Function) => hookEvent({ service: "Std", func: "in" }, cb),
        prompt: (text: string) => msg(["Std", "prompt"], text),
        in: (pid: number, data: any, source?: number | string) => msg(["Std", "in"], { pid: pid, data: data, source: source }),
    },
    Out: {
        print: (data, over?: number) => msg(["Out", "print"], { txt: data, over: over || 0 }),
        printLn: (data, over?: number) => msg(["Out", "println"], { txt: data, over: over || 0 }),
    },
    Process: {
        startEvent: cb => hookEvent(["Process", "start"], cb),
        msgEvent: cb => hookEvent(["Process", "msg"], cb),
        endEvent: cb => hookEvent(["Process", "end"], cb),
        selfEvent: cb => hookEvent(["Process", "self"], cb),
        msg: (pid, msg) => request(["Process", "msg"], { pid: pid, msg: msg }),
        end: () => msg(["Process", "end"]),
        crash: error => msg(["Process", "crash"], (error instanceof Error) ? ["ERROR", ...error.message.split(" : ")] : error),
        ready: () => msg(["Process", "ready"]),
        start: (exec, params) => request(["Process", "start"], { exec: exec, params: params }),
        kill: (pid) => request(["Process", "kill"], pid),
        list: () => request(["Process", "list"]),
        self: () => request(["Process", "self"]),
        startAndAwaitOutput: (exec, params) => startAndAwait(exec, params),
        changeWorkingDir: (path, pid) => request(["Process", "changeWorkingDir"], { path, pid }),
    },
    Util: Util,
};

// @ts-ignore
window.OS = libJSPseudoOS;
// @ts-ignore
window.CMD = CMD;


OS.Std.inEvent(awaitIn);


document.addEventListener("DOMContentLoaded", () => {
    request(["boot"])
        .then((data: string[]) => {
            fireHooks({ service: "Process", func: "start" }, data);
        });
});