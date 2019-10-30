import { IFSListEntry } from "../../Services/FileSystem";
import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { ILibCMD } from "../../Services/Cmd";
import { IProcess } from "../../Struct/Process";

declare var CMD: ILibCMD;
declare var OS: ILibOS;
declare var PROCESS: IProcess;

const ls: Function = (): void => {
    const opts: AppOpts = {
        all: false,
        human: false,
        long: false,
        "no-group": false,
        raw: false,
    };

    let count: number;
    let done: number = 0;

    const argMap: AppOptsMap = {
        a: "all",
        h: "human",
        l: "long",
        G: "no-group",
    };

    const formatFileName: Function = (entry: IFSListEntry): string => {
        let name: string = entry.name;
        if (opts.raw) {
            return name;
        }
        if (name.indexOf(" ") >= 0) {
            name = "'" + name + "'"
        }
        let fore: string = CMD.Colours.white;
        let back: string = CMD.Colours.black;
        if (!entry.file) {
            fore = CMD.Colours.blue;
        }
        return CMD.Colourize(name, fore, back);
    };

    const longOutputEntry: Function = (entry: IFSListEntry): any[] => {
        const out: { [s: string]: any } = {
            perms: entry.perms,
            user: entry.user,
            group: entry.group,
            size: entry.size,
            name: formatFileName(entry),
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

    const shortOutput: Function = (data: Array<IFSListEntry>): string[] => data.map(e => formatFileName(e));

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

    const start: Function = async (data: string[]) => {
        try {
            let paths = await OS.Util.loadArgs(data, opts, argMap);
            count = paths.length;
            if (count < 1) {
                paths = [""];
                count = 1;
            }
            paths.map(s => list(s));
        } catch (e) {
            error(e);
        }

    };
    start(PROCESS.params);
};

export default ls;