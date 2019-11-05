import { IFSListEntry } from "../../Services/FileSystem";
import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";


export default class Main {
    opts: AppOpts = {
        all: false,
        human: false,
        long: false,
        "no-group": false,
        raw: false,
    };
    count: number = 0;
    done: number = 0;

    argMap: AppOptsMap = {
        a: "all",
        h: "human",
        l: "long",
        G: "no-group",
    };

    process: IProcess;
    api: ILibOS;

    constructor(process: IProcess, OS: ILibOS) {
        this.process = process;
        this.api = OS;
        this.start(process.params);
    }

    async start(data: string[]) {
        try {
            let paths = await this.api.Util.loadArgs(data, this.opts, this.argMap);
            this.count = paths.length;
            if (this.count < 1) {
                paths = [""];
                this.count = 1;
            }
            paths.map(s => this.list(s));
        } catch (e) {
            this.error(e);
        }

    }

    formatFileName(entry: IFSListEntry): string {
        let name: string = entry.name;
        if (this.opts.raw) {
            return name;
        }
        if (name.indexOf(" ") >= 0) {
            name = "'" + name + "'"
        }
        let fore: string = this.api.CMD.Colours.white;
        let back: string = this.api.CMD.Colours.black;
        if (!entry.file) {
            fore = this.api.CMD.Colours.blue;
        }
        return this.api.CMD.Colourize(name, fore, back);
    };

    longOutputEntry(entry: IFSListEntry): any[] {
        const out: { [s: string]: any } = {
            perms: entry.perms,
            user: entry.user,
            group: entry.group,
            size: entry.size,
            name: this.formatFileName(entry),
        };
        if (this.opts["no-group"]) {
            delete out.group;
        }
        return Object.values(out);
    };

    longOutput(path: string, data: Array<IFSListEntry>): any[] {
        let arr: Array<string[] | string> = [
            path,
            ["perms\t", "user", this.opts["no-group"] ? "" : "group", "size", "name"].filter(c => c.length > 0)
        ];
        data.map(d => this.longOutputEntry(d)).map(e => arr.push(e));
        return arr;
    }

    shortOutput(data: Array<IFSListEntry>): string[] {
        return data.map(e => this.formatFileName(e));
    }

    output(path: string, data: Array<IFSListEntry>) {
        if (!this.opts.all) {
            data = data.filter(d => !d.name.startsWith("."));
        }
        if (this.opts.human) {
            // todo : Human Sizes
            // data.forEach(d => {
            //     d.size = OS.Util.bytesToHuman(d.size);
            // });
        }
        let result: string[] | Array<string[]>;
        result = this.opts.long ? this.longOutput(path, data) : this.shortOutput(data);

        this.api.Std.out(result);

        this.done++;
        if (this.done >= this.count) {
            this.api.Process.end();
        }
    }

    error(e: any) {
        this.api.Process.crash(e);
    }

    async list(path: string) {
        try {
            const data: IFSListEntry[] = await this.api.FS.list(path);
            this.output(path, data);
        } catch (e) {
            console.log("bob", e);
            this.error(e);
        }
    }
}