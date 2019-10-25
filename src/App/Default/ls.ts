import { IFSListEntry } from "../../Services/FileSystem";
import { ILibOS } from "../libOS";
declare var OS: ILibOS;

export const ls: Function = (): void => {
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

    const longOutputEntry: Function = (entry: IFSListEntry, columns: Array<string>): Array<any> => {
        const out = {
            perms: entry.perms,
            user: entry.user,
            group: entry.group,
            size: entry.size,
            name: entry.name,
        };
        if (opts["no-group"]) {
            delete out["group"];
        }
        return Object.values(out);
    };

    const longOutput: Function = (data: Array<IFSListEntry>) => {
        let arr: Array<Array<string>> = [
            ["perms\t", "user", opts["no-group"] ? "" : "group", "size", "name"].filter(c => c.length > 0)
        ];
        data.map(d => longOutputEntry(d, arr[0])).map(e => arr.push(e));
        return arr;
    };

    const shortOutput: Function = (data: Array<IFSListEntry>): Array<string> => data.map(e => e.name);

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
        let result: Array<string> | Array<Array<string>>;
        result = opts.long ? longOutput(data) : shortOutput(data);

        OS.Std.out(result);

        done++;
        if (done >= count) {
            OS.Process.end();
        }
    };

    const error: Function = (path: string, e: Error) => {
        console.log(e);
        OS.Process.crash(new Error(path + "\n" + e.toString()));
    };

    const list: Function = (path: string) => {
        OS.FS.list(path)
            .then((data: Array<Object>) => output(path, data))
            .catch((e: Error) => error(path, e));
    };

    const start: Function = (data: Array<string>): void => {
        console.log("Start LS", data);
        data = OS.Util.loadArgs(data, opts, argMap);
        count = data.length;
        data.map(s => list(s));

    };

    console.log("LS CODE LOADED");

    OS.Process.startEvent(start);
};