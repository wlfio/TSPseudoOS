import { ILibOS } from "../libOS";
import { IProcess } from "../../Struct/Process";

export default class Main {

    help: string[][] = [
        ["Usage: mkdir[OPTION]...DIRECTORY..."],
        ["Create the DIRECTORY(ies), if they do not already exist."],
        [""],
        ["Mandatory arguments to long options are mandatory for short options too."],
        //        ["  - m, --mode= MODE", "set file mode(as in chmod), not a = rwx - umask"],
        ["  - p, --parents", "no error if existing, make parent directories as needed"],
        ["  - v, --verbose", "print a message for each created directory"],
        //        ["  - Z", "", "", "set SELinux security context of each created directory"],
        //        ["  ", "", "", "to the default type"],
        ["  ", "--help", "", "display this help and exit"],
        ["  ", "--version", "output version information and exit"],
    ];

    version: string = [
        "mkdir (GNU coreutils) 0.1",
        "Copyright(C) 2010 wlf.io.",
        "License MIT License < https://raw.githubusercontent.com/wlfio/TSPseudoOS/master/LICENSE >.",
        "This is free software: you are free to change and redistribute it.",
        "There is NO WARRANTY, to the extent permitted by law.",
        "",
        "Written by wlf.io."
    ].join("\n");

    options: { [s: string]: any } = {
        help: false,
        version: false,
        verbose: false,
        parents: false,
    };
    optMap: { [s: string]: string } = {
        "?": "help",
        v: "verbose",
        p: "parents"
    };

    count: number = 0;
    OS: ILibOS;

    constructor(process: IProcess, OS: ILibOS) {
        this.OS = OS;
        this.start(process.params);
    }

    error(e: any) {
        if (e instanceof Array) {
            if (e[2] === "Path is not directory") {
                e = new Error("MKDIR ERROR : no such file or directory '" + e[3] + "' : " + e.join(" : "));
            }
        }
        this.OS.Process.crash(e);
    }

    breakPathIntoParentPaths(path: string): string[] {
        const parts: string[] = path.split("/").filter(s => s.length > 0);
        return parts.reduce((out: string[], inp: string, i: number) => {
            if (i === 0) {
                inp = "/" + inp;
            } else {
                inp = out[out.length - 1] + "/" + inp;
            }
            out.push(inp);
            return out;
        }, []);
    }

    breakPathsIntoParentPaths(paths: string[]): Array<string[]> {
        return paths.map((path: string) => {
            if (this.options.parents) {
                return this.breakPathIntoParentPaths(path);
            }
            return [path];
        });
    }

    async make(rawPaths: string[]): Promise<any> {
        let prefix: string = "";
        try {
            const paths: string[] = await this.OS.FS.resolve(rawPaths);
            console.log("PATHS", paths);
            const broken: string[][] = this.breakPathsIntoParentPaths(paths);
            console.log("BROKEN", broken);
            for (let j: number = 0; j < broken.length; j++) {
                const set: string[] = broken[j];
                for (let i: number = 0; i < set.length; i++) {
                    const path: string = set[i];
                    const done: boolean = await this.OS.FS.mkdir(path);
                    console.log("PATH DONE", path, done);
                    if (this.options.verbose && done) {
                        this.OS.Std.out(prefix + "created directory '" + set[this.count] + "'");
                    }
                    if (!done && (!this.options.parents)) {
                        this.OS.Std.out(prefix + "cannot create directory '" + set[this.count] + "': File exists");
                    }
                    prefix = "\n";
                }
            }
            this.OS.Process.end();
        } catch (e) {
            console.log("ERROROR", e);
            this.error(e);
        }
    }

    async start(args: string[]) {
        const params: string[] = await this.OS.Util.loadArgs(args, this.options, this.optMap);
        if (params.length < 1 && !this.options.help && !this.options.version) {
            this.OS.Process.crash(
                new Error([
                    "mkdir error",
                    "missing operand\nTry 'mkdir --help' for more information"
                    , JSON.stringify(args)].join(" : ")
                )
            );
            return;
        }
        if (this.options.help) {
            this.OS.Std.out(this.help);
        } else if (this.options.version) {
            this.OS.Std.out(this.version);
        } else {
            this.make(params);
        }
    };
}