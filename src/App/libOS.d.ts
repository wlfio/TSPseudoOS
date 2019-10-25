import { IFSListEntry } from "../Services/FileSystem";

declare const OS: ILibOS;

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
    error?: Error;
}

interface ILibStd {
    out(data: any): void;
    inEvent(cb: Function): void;
}

interface ILibOut {
    print(data: string | String[] | Array<string[]>, over?: number): void;
    printLn(data: string | String[] | Array<string[]>, over?: number): void;
}

interface ILibProcess {
    //startEvent(callback: (data: Array<string>) => void): void;
    startEvent(callback: Function): void;
    msgEvent(callback: Function): void;
    msg(pid: number, msg: any): Promise<any>;
    end(): void;
    crash(error: Error): void;
    ready(): void;
    start(exec: string, params: Array<string>): Promise<any>;
    kill(pid: number): Promise<any>;
    list(): Promise<any>;
    self(): Promise<any>;
}

interface ILibUtil {
    loadArgs(args: Array<string>, options: { [s: string]: any }, map: { [s: string]: string }): Array<string>;
    bytesToHuman(bytes: number, kibi?: boolean, bits?: boolean): string;
}

interface ILibFS {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<Array<string>>;
    list(path: string): Promise<Array<IFSListEntry>>;
    mkdir(path: string): Promise<string>;
    touch(path: string): Promise<Array<string>>;
    del(path: string): Promise<string>;
}

interface IDisplayItem {
    data: any;
    over?: number;
    newLine?: boolean;
}