import FS, { IFSListEntry } from "./Services/FileSystem";
import Identity from "./Struct/Identity";
import Processes from "./Services/Processes";
import { ILibOS } from "./App/OS";

declare const OS: ILibOS;

const rootIdent: Identity = new Identity("root", [], "/");

FS.mkdir("/", rootIdent);
FS.mkdir("/bin", rootIdent);

FS.mkdir("/home", rootIdent);
FS.mkdir("/home/guest", rootIdent);

FS.mkdir("/home/root", rootIdent);
FS.mkdir("/home/root/dir1", rootIdent);
FS.mkdir("/home/root/dir2", rootIdent);
FS.mkdir("/home/root/dir3", rootIdent);
FS.mkdir("/home/root/dir3/dir4", rootIdent);

FS.touch("/home/root/.hidden", rootIdent);
FS.write("/home/root/test1", "test1 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test2", "test2 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test3", "test3 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/dir3/test4", "test4 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);

const apps: { ls: Function } = {
    ls: () => {
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
            return Object.entries(entry).filter(e => columns.includes(e[0])).map(e => e[1]);
        };

        const longOutput: Function = (data: Array<IFSListEntry>) => {
            let arr: Array<Array<string>> = [
                ["perms", "user", opts["no-group"] ? "" : "group", "size", "name"].filter(c => c.length > 0)
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
            OS.Process.crash([path, e.toString()]);
        };

        const list: Function = (path: string) => {
            OS.FS.list(path)
                .then((data: Array<Object>) => output(path, data))
                .catch((e: Error) => error(path, e));
        };

        const start: Function = (data: Array<string>): void => {
            data = OS.Util.loadArgs(data, opts, argMap);
            count = data.length;
            data.map(s => list(s));

        };

        OS.Process.startEvent(start);
    },
};


FS.write("bin/ls", apps.ls.toString(), rootIdent);
FS.chmod("bin/ls", rootIdent, "755");



Processes.start("ls", ["-lh", "/home/root"], rootIdent)
    .then((data: any) => console.log("App Started", data))
    .catch((error: Error) => console.log("App Failed", error));