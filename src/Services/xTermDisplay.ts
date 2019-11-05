import { Terminal, IBufferLine } from "xterm";
import { IDisplay } from "./Display";
import { IProcessManager } from "./ProcessManager";
require("xterm/css/xterm.css");

export default class xTermDisplay implements IDisplay {
    terminal: Terminal;
    element: HTMLDivElement;
    manager: IProcessManager | null = null;

    constructor() {
        this.terminal = new Terminal();
        this.element = document.createElement("div");
    }

    init(pm: IProcessManager): void {
        this.manager = pm;
        const body: HTMLBodyElement | null = document.querySelector("body");
        if (body !== null) {
            body.append(this.element);
        }
        this.terminal.open(this.element);
        this.terminal.write("BOB");
        this.terminal.onKey(e => {

            const printable = !e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey;

            if (e.domEvent.keyCode === 13) {
                this.prompt();
            } else if (e.domEvent.keyCode === 8) {
                console.log("8", this.terminal.buffer.getLine(0));
                this.terminal.write('\b \b');
                // Do not delete the prompt
                // if (this.terminal._core.buffer.x > 2) {
                //     this.terminal.write('\b \b');
                // }
            } else if (printable) {
                this.terminal.write(e.key);
            }
        });

        this.terminal.onLineFeed(e => {
            console.log(e);
            const buf = this.terminal.buffer;
            const line: IBufferLine | undefined = buf.getLine(buf.baseY + buf.cursorY);
            if (line !== undefined) {
                console.log(buf.length, buf.baseY + buf.cursorY, line.translateToString());
            }
        });
        this.prompt();
    }

    prompt(): void {
        this.terminal.write('\r\n$ ');
    }

    setText(text: string): Promise<any> {
        console.log("xTerm SET TEXT", text);
        return Promise.resolve();
    }

    output(data: any, over?: number, newLine?: boolean): Promise<any> {
        console.log("xTerm OUTPUT", data, over, newLine);
        return Promise.resolve();
    }

    info(): Promise<any> {
        console.log("xTerm INFO");
        return Promise.resolve();
    }
}