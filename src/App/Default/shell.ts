import { ILibOS, IStdInMsg } from "../libOS";
import { IProcess } from "../../Struct/Process";

export default class Main {
    private bashHistoryFile: string = "~/.bash_history";

    private bashProcess: IProcess;

    private host: string = window.location.origin.split("://")[1].split(":")[0] || "[MISSING HOST]";
    private activeProcessID: number = -1;
    private activeOutputed: boolean = false;

    private subProcs: { [s: number]: IProcess } = {};

    private history: string[] = [];
    private historyPosition: number = 0;

    private api: ILibOS;

    constructor(process: IProcess, OS: ILibOS) {
        this.bashProcess = process;
        this.api = OS;
        this.api.Process.event.self((proc: IProcess) => this.selfUpdate(proc));
        this.api.Process.event.end((pid: number): Promise<any> => this.end(pid));
        this.api.Std.event.in((data: IStdInMsg) => this.stdIn(data));
        this.start();
    }

    setHistoryPosition(pos: number): void {
        this.historyPosition = Math.min(Math.max(pos, 0), this.history.length);
    }

    showHistory(pos: number): void {
        this.setHistoryPosition(pos);
        this.api.Display.prompt(this.history[this.history.length - this.historyPosition]);
    }

    newHistory(input: string): void {
        if (input.length > 0 && input !== this.history[this.history.length - 1]) {
            this.history.push(input);
            this.api.FS.append(this.bashHistoryFile, input + "\n");
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
        this.api.Std.out(
            (newLine ? "\n" : "")
            +
            this.api.CMD.Colourize(this.bashProcess.identity.user + "@" + this.host, this.api.CMD.Colours.green)
            +
            this.api.CMD.Colourize(":", this.api.CMD.Colours.white)
            +
            this.api.CMD.Colourize(this.getPromptPath(), this.api.CMD.Colours.blue)
            +
            this.api.CMD.Colourize("$ ", this.api.CMD.Colours.white)
        );
    }

    getPromptPath(): string {
        return this.bashProcess.identity.workingDir.replace("/home/" + this.bashProcess.identity.user, "~");
    }

    splitUserInput(text: string): string[] {
        const parts: string[] = text.match(/(".*?"|[^" \s]+)(?=\s* |\s*$)/g) || [];
        return parts.map(s => {
            s = s.trim();
            if (s.charAt(0) === "\"" && s.charAt(s.length - 1) === "\"") {
                s = s.slice(1, s.length - 1);
            }
            return s;
        });
    }

    start(): void {
        this.api.FS.read(this.bashHistoryFile)
            .then((content: string) => {
                this.history = content.split("\n")
                    .filter(s => s.length > 0)
                    .filter((s, i, a) => i > 0 && a[i - 1] !== s);
            });
        this.printPrompt();
    }

    resolveAppIn(msg: IStdInMsg): Promise<any> {
        this.api.Process.log("stdIn From App", msg, this.activeProcessID);
        const proc: IProcess | null = this.getSubProc(parseInt(msg.from, 10));
        let output: any = msg.data;
        if (msg.data instanceof Array && proc !== null) {
            if (msg.data[0] === "ERROR") {
                output = proc.exec.split("/").pop() + ": " + msg.data[2];
            }
        }
        if (parseInt(msg.from, 10) === this.activeProcessID) {
            this.activeOutputed = true;
        }
        this.api.Std.out(output);
        return Promise.resolve("asd");
    }

    ctrlCode(type: string): void {
        switch (type) {
            case "c":
                this.api.Std.out("^C");
                this.printPrompt(true);
                this.api.Display.prompt("");
                break;
        }
    }

    async tabComplete(text: string): Promise<any> {
        const parts: string[] = this.splitUserInput(text);
        let prompt: any = null;
        if (parts.length === 1) {
            console.log("TODO EXEC LISTING");
        } else {
            const part: string = parts[parts.length - 1];
            const dirs: string[] = part.split("/");
            const dir: string = dirs.slice(0, dirs.length - 1).join("/");
            const t: string = dirs[dirs.length - 1];
            const args: string[] = ["--raw"];
            if (t.startsWith(".")) {
                args.push("--all");
            }
            args.push(dir);
            const ls: any = await this.api.Process.startAndAwaitOutput("ls", args);
            const opts: string[] = ls.data;
            const result: string[] = opts.filter((e: string) => e.startsWith(t));
            if (result.length === 1) {
                dirs[dirs.length - 1] = result[0];
                const d: string = dirs.join("/");
                const isDir: boolean = await this.api.FS.dirExists(d);
                parts[parts.length - 1] = d + (isDir ? "/" : "");
            } else {
                prompt = opts;
            }
        }
        if (prompt !== null) {
            this.api.Std.out(text + "\n");
            this.api.Std.out(prompt);
            this.printPrompt(true);
        }
        this.api.Display.prompt(parts.map((s: string) => s.indexOf(" ") >= 0 ? "\"" + s + "\"" : s).join(" "));
        return Promise.resolve();
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

    selfUpdate(data: IProcess): Promise<any> {
        this.bashProcess = data;
        return Promise.resolve();
    }

    async stdIn(data: IStdInMsg): Promise<any> {
        if (data.from === "user") {
            if (typeof data.data === "string") {
                if (data.data.startsWith("§§§")) {
                    this.specialCode(data.data);
                } else {
                    if (this.activeProcessID > 0) {
                        this.api.Std.in(this.activeProcessID, data.data, data.from);
                        return;
                    }
                    if (data.data === "exit") {
                        this.api.Process.end();
                        return;
                    }
                    const parts: string[] = this.splitUserInput(data.data);
                    const exec: string = parts.shift() || "";
                    try {
                        this.activeOutputed = false;
                        const proc: any = await this.api.Process.start(exec, parts);
                        this.subProcs[proc.id] = proc;
                        this.activeProcessID = proc.id;
                        this.api.Process.log("Proc Started", proc);
                    } catch (e) {
                        console.log("EXEC ERROR", e);
                        try {
                            if (e[1] === "FS Error" && e[3] === "Not found") {
                                this.api.Std.out(exec + ": command not found");
                            } else {
                                this.api.Std.out(e[1]);
                            }
                        } catch (er) {
                            this.api.Std.out(["BASH LAUNCH ERROR", er.message]);
                        }
                        this.printPrompt(true);
                    }
                    this.newHistory(data.data);
                }
            }
        } else {
            const resolve: any = await this.resolveAppIn(data);
            if (typeof resolve !== "string") {
                console.log(resolve);
            }
        }
        return Promise.resolve();
    }
    end(pid: number): Promise<any> {
        const sub: IProcess | null = this.getSubProc(pid);
        if (sub !== null) {
            delete this.subProcs[pid];
            if (pid === this.activeProcessID) {
                this.activeProcessID = -1;
                this.printPrompt(this.activeOutputed);
            }
        }
        return Promise.resolve();
    }
}