import { IFSListEntry } from "../Services/FileSystem";

declare const OS: ILibOS;

export interface ILibOS {
    FS: ILibFS;
    Std: ILibStd;
    Out: ILibOut;
    Process: ILibProcess;
    Util: ILibUtil;
}

interface ILibStd {
    out(data: any): void;
}

interface ILibOut {
    print(msg: string | Array<String> | Array<Array<string>>): void;
    printLn(msg: string | Array<String> | Array<Array<string>>): void;
    printOver(msg: string | Array<String> | Array<Array<string>>, over: number): void;
}

interface ILibProcess {
    //startEvent(callback: (data: Array<string>) => void): void;
    startEvent(callback: Function): void;
    end(): void;
    crash(error: Error | Array<any>): void;
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