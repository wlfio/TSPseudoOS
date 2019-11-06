import { IFSListEntry } from "../Services/FileSystem";
import { PromiseFunction } from "../Struct/Types";
import { IProcess } from "../Struct/Process";
import { ILibCMD } from "../Services/Cmd";

declare const OS: ILibOS;

export interface IStdInMsg {
    from: string,
    data: any,
}

export interface ILibOS {
    FS: ILibFS;
    Std: ILibStd;
    Display: ILibDisplay;
    Process: ILibProcess;
    Util: ILibUtil;
    CMD: ILibCMD;
    //Remote: ILibRemote;
}

export interface IAppMessageType {
    service: string;
    func: string;
}

export interface IAppMessage {
    type: IAppMessageType;
    data?: any;
    id?: string;
    error?: any;
}

type AppMessageType = {
    service: string;
    func: string;
}
type AppMessage = {
    type: AppMessageType;
    data?: any;
    id?: string;
    error?: any;
}
type AppOpts = { [s: string]: any };
type AppOptsMap = { [s: string]: string };
type FunctionSignature = { service: string, func: any };

export interface ILibStd {
    event: ILibStdEvents;
    out(data: any): Promise<any>;
    in(pid: number, data: any, source?: number | string): Promise<any>;
}

interface ILibStdEvents {
    in(cb: (msg: IStdInMsg) => Promise<any>): void;
}

export interface ILibDisplay {
    printRaw(data: string | String[] | Array<string[]>, over?: number, newLine?: boolean): Promise<any>;
    print(data: string | String[] | Array<string[]>, over?: number): Promise<any>;
    printLn(data: string | String[] | Array<string[]>, over?: number): Promise<any>;
    prompt(text: string): Promise<any>;
    info(): Promise<any>;
}

export interface ILibProcess {
    //startEvent(callback: (data: string[]) => void): void;
    event: ILibProcessEvents;
    msg(pid: number, msg: any): Promise<any>;
    end(): void;
    crash(error: any): void;
    //ready(): void;
    start(exec: string, params: string[]): Promise<any>;
    kill(pid: number): Promise<any>;
    list(): Promise<any>;
    self(): Promise<any>;
    startAndAwaitOutput(exec: string, params: string[]): Promise<any>;
    changeWorkingPath(path: string, pid?: number): Promise<any>;
    log(...data: any): Promise<any>;
}

interface ILibProcessEvents {
    start(cb: (process: IProcess) => Promise<any>): void;
    msg(cb: (msg: any) => Promise<any>): void;
    end(cb: (pid: number) => Promise<any>): void;
    self(cb: (process: IProcess) => Promise<any>): void;
}

interface ILibUtil {
    loadArgs(args: string[], options: { [s: string]: any }, map: { [s: string]: string }): Promise<string[]>;
    bytesToHuman(bytes: number, kibi?: boolean, bits?: boolean): string;
}

interface ILibFS {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<string[]>;
    list(path: string): Promise<IFSListEntry[]>;
    mkdir(path: string): Promise<boolean>;
    touch(path: string): Promise<string[]>;
    del(path: string): Promise<string>;
    resolve(paths: string[]): Promise<string[]>;
    append(path: string, content: string): Promise<string[]>;
    fileExists(path: string): Promise<boolean>;
    dirExists(path: string): Promise<boolean>;
    delDir(path: string): Promise<any>;
}

interface ILibRemote {
    connect(address: string): Promise<number>;
    disconnect(cid: number): Promise<boolean>;
    in(cid: number, data: any, source?: number | string): void;
    outEvent(callback: Function): void;
}

interface IDisplayItem {
    data: any;
    over?: number;
    newLine?: boolean;
}