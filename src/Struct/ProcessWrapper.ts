import { IDisplay } from "../Services/Display";
import { IProcessManager } from "../Services/ProcessManager";
import FS from "../Services/FileSystem";
import Process from "./Process";
import { FunctionSignature, IDisplayItem, ILibOS, ILibFS, ILibStd } from "../App/libOS";
import { OSApi, FunctionSet } from "./Types";

class OSLib implements ILibOS {

    private _call: (signature: FunctionSignature, data: any) => Promise<any>;

    Std: ILibStd = {
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
    Process: FunctionSet = {
        end: (process: Process) => process.kill(),
        setSelf: (process: Process, data: { prop: string, value: any }) => process.set(data.prop, data.value),
        self: (process: Process) => Promise.resolve(process.data()),
        start: (process: Process, data: any) => this.manager.startProcess(data.exec, data.params, null, process),
        crash: (process: Process, error: any) => { this.api.Std.out(process, error); return process.kill(); },
        changeWorkingDir: (process: Process, data: any) => process.changeWorkingDir(data),
    };
    Display: FunctionSet = {
        // @ts-ignore
        prompt: (process: Process, text: string) => this.display.setText(text),
        // @ts-ignore
        print: (process: Process, item: IDisplayItem) => this.display.output(item.data, item.over, false),
        // @ts-ignore
        printLn: (process: Process, item: IDisplayItem) => this.display.output(item.data, item.over, true),
        info: () => this.display !== null ? this.display.info() : Promise.reject(new Error("PM Error : missing display : ...")),
    };

    constructor(process: Process, call: (signature: FunctionSignature, data: any) => Promise<any>) {
        this._call = call;
    }

    call(service: string, func: string, data: any): Promise<any> {
        return this._call({ service: service, func: func }, data);
    }

}

export default class ProcessWrapper {
    display: IDisplay;
    manager: IProcessManager;
    lib: OSLib;

    process: Process;

    private api: OSApi = {
        Std: {
            out: (process: Process, data: any) =>
                process.hasParent() ? process.intoParent(data) : this.api.Display.print(process, { data: data, over: 0 }),
            in: (process: Process, data: any) => process.intoChild(data.pid, data.data, data.source || null),
        },
        FS: {
            list: (process: Process, data: string) => FS.list(data, process),
            mkdir: (process: Process, data: string) => FS.mkdir(data, process),
            resolve: (process: Process, data: string[]) => FS.resolveWorkingPaths(data, process),
            append: (process: Process, data: { path: string, content: string }) => FS.append(data.path, data.content, process),
            write: (process: Process, data: { path: string, content: string }) => FS.write(data.path, data.content, process),
            touch: (process: Process, path: string) => FS.touch(path, process),
            read: (process: Process, path: string) => FS.read(path, process),
            del: (process: Process, path: string) => FS.del(path, process),
            dirExists: (process: Process, path: string) => FS.dirExists(path, process),
            fileExists: (process: Process, path: string) => FS.fileExists(path, process),
            delDir: (process: Process, path: string) => FS.delDir(path, process),
        },
        Process: {
            end: (process: Process) => process.kill(),
            setSelf: (process: Process, data: { prop: string, value: any }) => process.set(data.prop, data.value),
            self: (process: Process) => Promise.resolve(process.data()),
            start: (process: Process, data: any) => this.manager.startProcess(data.exec, data.params, null, process),
            crash: (process: Process, error: any) => { this.api.Std.out(process, error); return process.kill(); },
            changeWorkingDir: (process: Process, data: any) => process.changeWorkingDir(data),
        },
        Display: {
            // @ts-ignore
            prompt: (process: Process, text: string) => this.display.setText(text),
            // @ts-ignore
            print: (process: Process, item: IDisplayItem) => this.display.output(item.data, item.over, false),
            // @ts-ignore
            printLn: (process: Process, item: IDisplayItem) => this.display.output(item.data, item.over, true),
            info: () => this.display !== null ? this.display.info() : Promise.reject(new Error("PM Error : missing display : ...")),
        }
    };

    constructor(manager: IProcessManager, display: IDisplay, process: Process) {
        this.manager = manager;
        this.display = display;
        this.process = process;
        this.lib = new OSLib(process, (signature: FunctionSignature, data: any) => this.call(signature, data));
    }


    call(signature: FunctionSignature, data: any): Promise<any> {
        if (this.api.hasOwnProperty(signature.service)) {
            if (this.api[signature.service].hasOwnProperty(signature.func)) {
                return this.api[signature.service][signature.func](this.process, data);
            }
        }
        return Promise.reject(
            new Error([
                "PM Error",
                "Atempt to access non-existant System Call\n" + signature.service + ">" + signature.func,
                this.process.exec + "[" + this.process.id + "]"
            ].join(" : "))
        );
    }
}

