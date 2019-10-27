import { IFSListEntry } from "../Services/FileSystem";

declare const OS: ILibOS;

export interface IStdInMsg {
    from: string,
    data: any,
}

export interface ILibOS {
    FS: ILibFS;
    Std: ILibStd;
    Out: ILibOut;
    Process: ILibProcess;
    Util: ILibUtil;
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

type AppOpts = { [s: string]: any };
type AppOptsMap = { [s: string]: string };

interface ILibStd {
    out(data: any): void;
    inEvent(cb: Function): void;
}

interface ILibOut {
    print(data: string | String[] | Array<string[]>, over?: number): void;
    printLn(data: string | String[] | Array<string[]>, over?: number): void;
}

interface ILibProcess {
    //startEvent(callback: (data: string[]) => void): void;
    startEvent(callback: Function): void;
    msgEvent(callback: Function): void;
    endEvent(callback: Function): void;
    msg(pid: number, msg: any): Promise<any>;
    end(): void;
    crash(error: any): void;
    ready(): void;
    start(exec: string, params: string[]): Promise<any>;
    kill(pid: number): Promise<any>;
    list(): Promise<any>;
    self(): Promise<any>;
}

interface ILibUtil {
    loadArgs(args: string[], options: { [s: string]: any }, map: { [s: string]: string }): Promise<string[]>;
    bytesToHuman(bytes: number, kibi?: boolean, bits?: boolean): string;
}

interface ILibFS {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<string[]>;
    list(path: string): Promise<Array<IFSListEntry>>;
    mkdir(path: string): Promise<boolean>;
    touch(path: string): Promise<string[]>;
    del(path: string): Promise<string>;
    resolve(paths: string[]): Promise<string[]>;
    append(path: string, content: string): Promise<string[]>;
}

interface IDisplayItem {
    data: any;
    over?: number;
    newLine?: boolean;
}