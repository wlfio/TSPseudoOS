import { IFSListEntry } from "../../Services/FileSystem";
import { ILibOS } from "../libOS";
import { ILibCMD } from "../../Services/Cmd";
import { IProcess } from "../../Struct/Process";

declare var CMD: ILibCMD;
declare var OS: ILibOS;
declare var PROCESS: IProcess;

const ls: Function = (): void => {
    const opts: { all: boolean; human: boolean; long: boolean; "no-group": boolean } = {
        all: false,
        human: false,
        long: false,
        "no-group": false,
    };

    let count: number;
    let done: number = 0;

    const argMap: { [s: string]: string } = {
        a: "all",
        h: "human",
        l: "long",
        G: "no-group",
    };

    const colourFileName: Function = (entry: IFSListEntry): string => {
        let fore: string = CMD.Colours.white;
        let back: string = CMD.Colours.black;
        if (!entry.file) {
            fore = CMD.Colours.blue;
        }
        return CMD.Colourize(entry.name, fore, back);
    };

    const longOutputEntry: Function = (entry: IFSListEntry): any[] => {
        const out: { [s: string]: any } = {
            perms: entry.perms,
            user: entry.user,
            group: entry.group,
            size: entry.size,
            name: colourFileName(entry),
        };
        if (opts["no-group"]) {
            delete out.group;
        }
        return Object.values(out);
    };

    const longOutput: Function = (path: string, data: Array<IFSListEntry>) => {
        let arr: Array<string[] | string> = [
            path,
            ["perms\t", "user", opts["no-group"] ? "" : "group", "size", "name"].filter(c => c.length > 0)
        ];
        data.map(d => longOutputEntry(d)).map(e => arr.push(e));
        return arr;
    };

    const shortOutput: Function = (data: Array<IFSListEntry>): string[] => data.map(e => colourFileName(e));

    const output: Function = (path: string, data: Array<IFSListEntry>) => {
        if (!opts.all) {
            data = data.filter(d => !d.name.startsWith("."));
        }
        if (opts.human) {
            // todo : Human Sizes
            // data.forEach(d => {
            //     d.size = OS.Util.bytesToHuman(d.size);
            // });
        }
        let result: string[] | Array<string[]>;
        result = opts.long ? longOutput(path, data) : shortOutput(data);

        OS.Std.out(result);

        done++;
        if (done >= count) {
            OS.Process.end();
        }
    };

    const error: Function = (e: any) => {
        OS.Process.crash(e);
    };

    const list: Function = (path: string) => {
        OS.FS.list(path)
            .then((data: Array<Object>) => output(path, data))
            .catch((e: any) => error(e));
    };

    const start: Function = (data: string[]): void => {
        OS.Util.loadArgs(data, opts, argMap)
            .then((data) => {
                count = data.length;
                if (data.length < 1) {
                    data = [""];
                    count = 1;
                }
                data.map(s => list(s));
            })
            .catch(e => error(e));

    };
    start(PROCESS.params);
};

export default ls;