import { IFSListEntry } from "../Services/FileSystem";
import { PromiseFunction } from "../Struct/Types";

declare const OS: ILibOS;

export interface IStdInMsg {
    from: string,
    data: any,
}

export interface ILibOS {
    FS: ILibFS;
    Std: ILibStd;
    Display: ILibOut;
    Process: ILibProcess;
    Util: ILibUtil;
    Remote: ILibRemote;
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
    out(data: any): void;
    in(pid: number, data: any, source?: number | string): void;
}

interface ILibStdEvents {
    in(cb: (msg: IStdInMsg) => Promise<any>): void;
}

interface ILibOut {
    print(data: string | String[] | Array<string[]>, over?: number): void;
    printLn(data: string | String[] | Array<string[]>, over?: number): void;
    prompt(text: string): void;
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
}

interface ILibProcessEvents {
    start(callback: PromiseFunction): void;
    msg(callback: PromiseFunction): void;
    end(callback: PromiseFunction): void;
    self(callback: PromiseFunction): void;
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