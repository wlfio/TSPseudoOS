import { ILibCMD } from "../../Services/Cmd";
import { ILibOS, IStdInMsg } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var CMD: ILibCMD;
declare var OS: ILibOS;
declare var PROCESS: IProcess;


const bash: Function = () => {

    let bashProcess: IProcess;
    // let user: string = "";
    // let path: string = "";
    let host: string = window.location.origin.split("://")[1].split(":")[0] || "[MISSING HOST]";
    let activeProcessID: number = -1;
    let activeOutputed: boolean = false;
    const bashHistoryFile: string = "~/.bash_history";

    const subProcs: { [s: number]: IProcess } = {};

    let history: string[] = [];
    let historyPosition: number = 0;

    const showHistory: Function = (pos: number): void => {
        historyPosition = pos;
        if (historyPosition < 0) {
            historyPosition = 0;
        }
        if (historyPosition > history.length) {
            historyPosition = history.length;
        }
        OS.Std.prompt(history[history.length - historyPosition]);
    };

    const newHistory: Function = (input: string) => {
        if (input.length > 0 && input !== history[history.length - 1]) {
            history.push(input);
            OS.FS.append(bashHistoryFile, input + "\n");
        }
        historyPosition = 0;
    };

    const getSubProc: Function = (pid: number): IProcess | null => {
        if (subProcs.hasOwnProperty(pid)) {
            return subProcs[pid];
        }
        return null;
    };

    const printPrompt: Function = (newLine?: boolean) => {
        newLine = newLine === true;
        OS.Std.out(
            (newLine ? "\n" : "")
            +
            CMD.Colourize(bashProcess.identity.user + "@" + host, CMD.Colours.green)
            +
            CMD.Colourize(":", CMD.Colours.white)
            +
            CMD.Colourize(bashProcess.identity.workingDir.replace("/home/" + bashProcess.identity.user, "~"), CMD.Colours.blue)
            +
            CMD.Colourize("$ ", CMD.Colours.white)
        );
    };

    // const cancelCurrentProcess: Function = () => {
    //     printPrompt();
    // };

    const splitUserInput: Function = (text: string): string[] => {
        const parts = text.match(/(".*?"|[^" \s]+)(?=\s* |\s*$)/g) || [];
        return parts.map(s => {
            s = s.trim();
            if (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
                s = s.slice(1, s.length - 1);
            }
            return s;
        });
    }

    const start: Function = (process: IProcess) => {
        bashProcess = process;
        OS.FS.read(bashHistoryFile)
            .then((content: string) => {
                history = content.split("\n")
                    .filter(s => s.length > 0)
                    .filter((s, i, a) => i > 0 && a[i - 1] !== s);
            });
        printPrompt();
    };

    const resolveAppIn: Function = (msg: IStdInMsg): Promise<any> => {
        const proc: IProcess = getSubProc(msg.from);
        let output: any = msg.data;
        if (msg.data instanceof Array) {
            if (msg.data[0] === "ERROR") {
                output = proc.exec.split("/").pop() + ": " + msg.data[2];
            }
        }
        if (parseInt(msg.from, 10) === activeProcessID) {
            activeOutputed = true;
        }
        OS.Std.out(output);
        return Promise.resolve("asd");
    };

    const ctrlCode: Function = (type: string): void => {
        console.log("CTRL CODE", type);
        switch (type) {
            case "c":
                OS.Std.out("^C");
                printPrompt(true);
                break;
        }
    };

    const tabComplete: Function = async (text: string) => {
        const parts = splitUserInput(text);
        console.log(1, parts.join(">"));
    }

    const specialCode: Function = (code: string): void => {
        const parts: string[] = code.split("§§§").filter(s => s.length > 0);
        switch (parts[0].toLowerCase()) {
            case "ctrl":
                ctrlCode(parts[1]);
                break;
            case "dir":
                showHistory(parseInt(parts[1], 10) + historyPosition);
                break;
            case "tab":
                tabComplete(parts[1]);
                break;
            default:
                console.log("SPECIAL CODE", parts);
                break;
        }
    };

    const selfUpdate: Function = (data: IProcess) => {
        console.log("UPDATE SELF", data);
        bashProcess = data;
    };

    const stdIn: (msg: IStdInMsg) => void = async (data: IStdInMsg) => {
        if (data.from === "user") {
            if (typeof data.data === "string") {
                if (data.data.startsWith("§§§")) {
                    specialCode(data.data);
                } else {
                    if (activeProcessID > 0) {
                        console.log("PASS ON STD IN", bashProcess.id);
                        OS.Std.in(activeProcessID, data.data, data.from);
                        return;
                    }
                    if (data.data === "exit") {
                        OS.Process.end();
                        return;
                    }
                    const parts: string[] = splitUserInput(data.data);
                    const exec: string = parts.shift() || "";
                    try {
                        const proc = await OS.Process.start(exec, parts);
                        activeOutputed = false;
                        subProcs[proc.id] = proc;
                        activeProcessID = proc.id;
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
                        printPrompt(true);
                    }
                    newHistory(data.data);
                }
            }
        } else {
            const resolve = await resolveAppIn(data);
            if (typeof resolve !== "string") {
                console.log(resolve);
            }
        }
    };
    const end: Function = (pid: number) => {
        const sub: IProcess | null = getSubProc(pid);
        if (sub !== null) {
            delete subProcs[pid];
            if (pid === activeProcessID) {
                activeProcessID = -1;
                printPrompt(activeOutputed);
            }
        }
    };

    // const contentLoad: () => void = (): void => {
    //     const body: HTMLBodyElement | null = document.querySelector("body");
    // };

    OS.Process.selfEvent(selfUpdate);
    OS.Process.endEvent(end);
    OS.Std.inEvent(stdIn);
    start(PROCESS);
    // window.addEventListener("DOMContentLoaded", contentLoad);
};

export default bash;