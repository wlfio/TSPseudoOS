import FS from "./FileSystem";
import Process from "../Struct/Process";
import Identity from "../Struct/Identity";

let libJS: string | null = null;

const getLib: Function = async () => {
    const request: Request = new Request("osLib.bundle.js");
    return await fetch(request).then(response => response.text());
};


const processes: { [s: number]: Process } = {

};

let pids: number = 0;

const pending: Array<IPendingApp> = [];

const pendStart: Function = (exec: string, params: Array<string>, identity: Identity, parent?: any) => {
    return new Promise((resolve, reject) => {
        pending.push({
            args: [
                exec,
                params,
                identity,
                parent,
            ],
            resolve: resolve,
            reject: reject,
        });
    });
};

interface IPendingApp {
    args: Array<any>;
    resolve: Function;
    reject: Function;
}

const startProcess: Function = (exec: string, params: Array<string>, identity: Identity, parent?: any) => {
    if (libJS === null) {
        return pendStart(exec, params, identity, parent);
    }
    identity = identity || parent.identity;
    // const frame = document.createElement('iframe');
    try {
        return new Promise((resolve, reject) => {
            FS.execRead(exec, identity)
                .then((data: Array<string>) => {
                    const execPath: string = data[0];
                    const code: string = data[1];
                    pids++;

                    const process: Process = new Process(pids, execPath, params, identity, parent);

                    process.loadBin(libJS || "");
                    process.loadBin("(" + code + ")();");

                    processes[pids] = process;

                    process.spawn();
                    resolve([process.id, process.exec, process.params]);
                })
                .catch((e: Error) => reject(e));
        });
    } catch (e) {
        console.log(["Process Error", e]);
        return Promise.reject(["Process Error", e]);
    }
};


const startPending: Function = () => {
    try {
        pending.forEach(pend => {
            startProcess(pend.args[0], pend.args[1], pend.args[2], pend.args[3])
                .then(pend.resolve)
                .catch(pend.reject);
        });
    } catch (e) {
        console.log("START PEND ERROR", e);
    }
};

const getProcessFromSource: Function = (source: Window): Process | null =>
    Object.values(processes).find(p => p.isSource(source)) || null;
const getProcessFromID: Function = (id: number): Process | null =>
    Object.values(processes).find(p => p.id === id) || null;

const killProcess: Function = (processID: number) => {
    const process: Process = getProcessFromID(processID);
    if (process !== null) {
        process.kill();
    }
};


const OS: { [s: string]: { [s: string]: Function } } = {
    FS: {
        list: (process: Process, data: string) => FS.list(data, process.identity),
    },
    Process: {
        end: (process: Process) => process.kill(),
    },
    Std: {
        out: (process: Process, data: any) => process.hasParent() ? process.intoParent(data) : OS.Out.printLn(process, data),
    },
    Out: {
        print: (process: Process, data: any) => console.log("print", data),
        printLn: (process: Process, data: any) => console.log("printLn", data),
    }
};

const systemCall: Function = (process: Process, type: Array<string>, data: any) => {
    if (OS.hasOwnProperty(type[0])) {
        if (OS[type[0]].hasOwnProperty(type[1])) {
            return OS[type[0]][type[1]](process, data);
        }
    }
    console.log("Unhandled SysCall", process.id, type, data);
};

const appMessage: Function = (message: any): any => {
    const process: Process = getProcessFromSource(message.source);
    if (processes === null) {
        return;
    }
    const msg: IAppMessage = message.data;
    const type: Array<string> = msg.type;
    if (!(type instanceof Array)) {
        return;
    }

    console.log("MSG FROM", process.id, type);
    if (type[0] === "boot") {
        process.respond(process.params, msg.id);
        return;
    }

    const p: Promise<any> = systemCall(process, type, msg.data);
    const wantsPromise: Boolean = (typeof msg.id === "string" && msg.id.length > 0);
    if (wantsPromise) {
        if (p instanceof Promise) {
            p.then(data => process.respond(data, msg.id));
        } else {
            throw ["Syscall Error", type, "did not return promise"];
        }
    }
};

interface IAppMessage {
    type: Array<string>;
    data?: any;
    id?: string;
}

getLib()
    .then((data: string) => { libJS = data.replace(/sourceMappingURL/g, ""); startPending(); })
    .catch((err: Error) => console.log("FETCH LIB ERROR", err));

window.addEventListener("message", appMessage);

export default {
    kill: killProcess,
    start: startProcess,
};