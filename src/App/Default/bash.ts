import { ILibCMD } from "../../Services/Cmd";
import { ILibOS, IStdInMsg } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var CMD: ILibCMD;


const bash: Function = (process: IProcess, OS: ILibOS) => {
    const bashHistoryFile: string = "~/.bash_history";

    class Bash {
        bashProcess: IProcess;

        host: string = window.location.origin.split("://")[1].split(":")[0] || "[MISSING HOST]";
        activeProcessID: number = -1;
        activeOutputed: boolean = false;

        subProcs: { [s: number]: IProcess } = {};

        history: string[] = [];
        historyPosition: number = 0;

        constructor(process: IProcess) {
            this.bashProcess = process;
            OS.Process.selfEvent((proc: IProcess) => this.selfUpdate(proc));
            OS.Process.endEvent((pid: number) => this.end(pid));
            OS.Std.inEvent((data: IStdInMsg) => this.stdIn(data));
            this.start();
        }

        setHistoryPosition(pos: number): void {
            this.historyPosition = Math.min(Math.max(pos, 0), history.length);
        }

        showHistory(pos: number): void {
            this.setHistoryPosition(pos);
            OS.Std.prompt(this.history[this.history.length - this.historyPosition]);
        }

        newHistory(input: string) {
            if (input.length > 0 && input !== this.history[this.history.length - 1]) {
                this.history.push(input);
                OS.FS.append(bashHistoryFile, input + "\n");
            }
            this.historyPosition = 0;
        }

        getSubProc(pid: number): IProcess | null {
            if (this.subProcs.hasOwnProperty(pid)) {
                return this.subProcs[pid];
            }
            return null;
        }

        printPrompt(newLine?: boolean): void {
            newLine = newLine === true;
            OS.Std.out(
                (newLine ? "\n" : "")
                +
                CMD.Colourize(this.bashProcess.identity.user + "@" + this.host, CMD.Colours.green)
                +
                CMD.Colourize(":", CMD.Colours.white)
                +
                CMD.Colourize(this.bashProcess.identity.workingDir.replace("/home/" + this.bashProcess.identity.user, "~"), CMD.Colours.blue)
                +
                CMD.Colourize("$ ", CMD.Colours.white)
            );
        }

        splitUserInput(text: string): string[] {
            const parts = text.match(/(".*?"|[^" \s]+)(?=\s* |\s*$)/g) || [];
            return parts.map(s => {
                s = s.trim();
                if (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
                    s = s.slice(1, s.length - 1);
                }
                return s;
            });
        }

        start() {
            OS.FS.read(bashHistoryFile)
                .then((content: string) => {
                    this.history = content.split("\n")
                        .filter(s => s.length > 0)
                        .filter((s, i, a) => i > 0 && a[i - 1] !== s);
                });
            this.printPrompt();
        }

        resolveAppIn(msg: IStdInMsg): Promise<any> {
            const proc: IProcess | null = this.getSubProc(parseInt(msg.from));
            let output: any = msg.data;
            if (msg.data instanceof Array && proc !== null) {
                if (msg.data[0] === "ERROR") {
                    output = proc.exec.split("/").pop() + ": " + msg.data[2];
                }
            }
            if (parseInt(msg.from, 10) === this.activeProcessID) {
                this.activeOutputed = true;
            }
            OS.Std.out(output);
            return Promise.resolve("asd");
        }

        ctrlCode(type: string): void {
            console.log("CTRL CODE", type);
            switch (type) {
                case "c":
                    OS.Std.out("^C");
                    this.printPrompt(true);
                    OS.Std.prompt("");
                    break;
            }
        }

        async tabComplete(text: string) {
            const parts = this.splitUserInput(text);
            let prompt: any = null
            if (parts.length === 1) {

            } else {
                const part = parts[parts.length - 1];
                const dirs = part.split("/");
                const dir = dirs.slice(0, dirs.length - 1).join("/");
                const ls = await OS.Process.startAndAwaitOutput("ls", ["--raw", dir]);
                const opts = ls.data;
                const t = dirs[dirs.length - 1];
                console.log({ text, parts, dirs, dir, t, opts });
                const result = opts.filter((e: string) => e.startsWith(t));
                if (result.length === 1) {
                    dirs[dirs.length - 1] = result[0];
                    const d = dirs.join("/");
                    console.log(d);
                    const isDir = await OS.FS.dirExists(d);
                    parts[parts.length - 1] = d + (isDir ? "/" : "");
                } else {
                    prompt = opts;
                }
            }
            if (prompt !== null) {
                OS.Std.out(text + "\n");
                OS.Std.out(prompt);
                this.printPrompt(true);
            }
            OS.Std.prompt(parts.map((s: string) => s.indexOf(" ") >= 0 ? '"' + s + '"' : s).join(" "));

        }

        specialCode(code: string): void {
            const parts: string[] = code.split("§§§").filter(s => s.length > 0);
            switch (parts[0].toLowerCase()) {
                case "ctrl":
                    this.ctrlCode(parts[1]);
                    break;
                case "dir":
                    this.showHistory(parseInt(parts[1], 10) + this.historyPosition);
                    break;
                case "tab":
                    this.tabComplete(parts[1]);
                    break;
                default:
                    console.log("SPECIAL CODE", parts);
                    break;
            }
        }

        selfUpdate(data: IProcess): void {
            console.log("UPDATE SELF", data);
            this.bashProcess = data;
        }

        async stdIn(data: IStdInMsg) {
            if (data.from === "user") {
                if (typeof data.data === "string") {
                    if (data.data.startsWith("§§§")) {
                        this.specialCode(data.data);
                    } else {
                        if (this.activeProcessID > 0) {
                            console.log("PASS ON STD IN", this.bashProcess.id);
                            OS.Std.in(this.activeProcessID, data.data, data.from);
                            return;
                        }
                        if (data.data === "exit") {
                            OS.Process.end();
                            return;
                        }
                        const parts: string[] = this.splitUserInput(data.data);
                        const exec: string = parts.shift() || "";
                        try {
                            const proc = await OS.Process.start(exec, parts);
                            this.activeOutputed = false;
                            this.subProcs[proc.id] = proc;
                            this.activeProcessID = proc.id;
                        } catch (e) {
                            console.log("EXEC ERROR", e);
                            try {
                                if (e[1] === "FS Error" && e[3] === "Not found") {
                                    OS.Std.out(exec + ": command not found");
                                } else {
                                    OS.Std.out(e[1]);
                                }
                            } catch (er) {
                                OS.Std.out(["BASH LAUNCH ERROR", er.message]);
                            }
                            this.printPrompt(true);
                        }
                        this.newHistory(data.data);
                    }
                }
            } else {
                const resolve = await this.resolveAppIn(data);
                if (typeof resolve !== "string") {
                    console.log(resolve);
                }
            }
        }
        end(pid: number): void {
            const sub: IProcess | null = this.getSubProc(pid);
            if (sub !== null) {
                delete this.subProcs[pid];
                if (pid === this.activeProcessID) {
                    this.activeProcessID = -1;
                    this.printPrompt(this.activeOutputed);
                }
            }
        }

        // const contentLoad: () => void = (): void => {
        //     const body: HTMLBodyElement | null = document.querySelector("body");
        // };
    }

    return new Bash(process);

    //start(PROCESS);
    // window.addEventListener("DOMContentLoaded", contentLoad);
};

export default bash;