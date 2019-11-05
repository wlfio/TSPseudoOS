import { ILibOS, AppOptsMap, AppOpts } from "../libOS";
import { IProcess } from "../../Struct/Process";


export default class Main {
    options: AppOpts = {
        number: false,
        "squeeze-blank": false,
    };

    optMap: AppOptsMap = {
        n: "number",
        s: "squeeze-blank",
    };

    count: number = 0;

    OS: ILibOS;

    constructor(process: IProcess, OS: ILibOS) {
        this.OS = OS;
        this.start(process.params);
    }

    error(e: any) {
        this.OS.Process.crash(e);
    }

    splitLines(content: string): string[][] {
        const lines: string[][] = [];
        let empty: boolean = false;
        content.split("\n").forEach((txt: string) => {
            this.count++;
            if (txt.length < 1) {
                if (empty) {
                    return;
                }
                empty = true;
            } else {
                empty = false;
            }
            const line: string[] = [];
            if (this.options.number) {
                line.push(this.count.toString());
            }
            line.push(txt);
            lines.push(line);
        });
        return lines;
    }

    output(content: string) {
        this.OS.Std.out(this.splitLines(content));
    }

    async cat(paths: string[]): Promise<any> {
        try {
            for (let i: number = 0; i < paths.length; i++) {
                const content: string | null = await this.OS.FS.read(paths[i]);
                this.output(content);
            }
            this.OS.Process.end();
        } catch (e) {
            this.error(e);
        }
    }

    async start(data: string[]) {
        try {
            const paths = await this.OS.Util.loadArgs(data, this.options, this.optMap);

            if (paths.length < 1) {
                throw new Error("CAT ERROR : you must include file path(s) : " + JSON.stringify(data));
            }
            this.cat(paths);
        } catch (e) {
            console.log("CAT ERROR", e);
            this.error(e);
        }
    }
}