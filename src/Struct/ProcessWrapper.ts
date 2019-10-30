import { IDisplay } from "../Services/Display";
import { IProcessManager } from "../Services/ProcessManager";
import FS from "../Services/FileSystem";
import Process from "./Process";
import { FunctionSignature, IDisplayItem } from "../App/libOS";
import { OSApi } from "./Types";

class OSLib {
    display: IDisplay;
    manager: IProcessManager;
    wrapper: ProcessWrapper;

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

    constructor(wrapper: ProcessWrapper, display: IDisplay, manager: IProcessManager) {
        this.wrapper = wrapper;
        this.display = display;
        this.manager = manager;
    }

    call(signature: FunctionSignature, data: any): Promise<any> {
        if (this.api.hasOwnProperty(signature.service)) {
            if (this.api[signature.service].hasOwnProperty(signature.func)) {
                return this.api[signature.service][signature.func](this.wrapper.process, data);
            }
        }
        return Promise.reject(
            new Error([
                "PM Error",
                "Atempt to access non-existant System Call\n" + signature.service + ">" + signature.func,
                this.wrapper.process.exec + "[" + this.wrapper.process.id + "]"
            ].join(" : "))
        );
    }
}

class ProcessWrapper {
    api: OSLib;
    process: Process;

    constructor(manager: IProcessManager, display: IDisplay, process: Process) {
        this.process = process;
        this.api = new OSLib(this, display, manager);
    }
}

