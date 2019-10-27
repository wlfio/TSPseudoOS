import ProcessManager from "./ProcessManager";

interface IQueuedDisplayItem {
    text: any[];
    over: number;
}

export default class Display {
    display: HTMLDivElement;
    input: HTMLSpanElement;

    queuedItems: IQueuedDisplayItem[] = [];

    processManager: ProcessManager | null = null;

    constructor() {
        this.display = document.createElement("div");
        this.input = document.createElement("span");
    }

    init(processManager: ProcessManager): void {
        this.processManager = processManager;
        this.createDisplay();
        document.addEventListener("keydown", () => {
            if (document.activeElement !== this.input) {
                this.input.focus();
            }
        });
        // document.addEventListener("click", () => {
        //     this.input.focus();
        // });
        this.input.addEventListener("keydown", (ev: KeyboardEvent) => {
            if (ev.ctrlKey && ev.key !== "Control" && !ev.repeat) {
                this.controlKey(ev.key);
            } else if ((ev.key === "ArrowUp" || ev.key === "ArrowDown") && !ev.repeat) {
                this.history(ev.key === "ArrowDown" ? -1 : 1);
            } else if (ev.key === "Enter") {
                if (!ev.repeat) {
                    this.enterText();
                }
            } else {
                return;
            }
            ev.preventDefault();
            console.log(ev);
        });
        this.processQueue();
    }

    private colourizeText(text: string): HTMLElement[] {
        const segments: string[] = text.split(/(?=§[0-9A-F]{6})/);
        return segments.map((txt: string): HTMLElement => {
            const span: HTMLSpanElement = document.createElement("span");
            if (txt.startsWith("§")) {
                const colours: String = txt.slice(0, 7);
                span.setAttribute("style", "color:#" + colours.slice(1, 4) + ";background-color:#" + colours.slice(4, 7) + ";");
                txt = txt.slice(7);
            }
            span.textContent = txt;
            return span;
        });
    }

    private breakUptext(text: string): HTMLElement[] {
        const elements: HTMLElement[] = [];

        text.split("\n").forEach((t: string, index: number, array: string[]) => {
            const span: HTMLSpanElement = document.createElement("span");
            this.colourizeText(t).forEach((e: HTMLElement) => {
                span.append(e);
            });
            elements.push(span);
            if (index < (array.length - 1)) {
                elements.push(document.createElement("br"));
            }
        });

        return elements;
    }


    private writeToDisplay(text: any[], over?: number): void {
        over = over || 0;
        text.map((e) => {
            this.display.insertBefore(e, this.input);
        });
    }

    private reduceArrayForDisplay(data: Array<any>, level: number): string {
        return data.reduce((out: string, inp: any, index: number) => {
            const type: string = typeof inp;
            if (type === "string" || type === "number") {
                out += (index < 1 ? "" : "\t") + inp;
            } else {
                if (inp instanceof Array) {
                    out += (index < 1 ? "" : "\n") + this.reduceArrayForDisplay(inp, level + 1);
                }
            }
            return out;
        }, "");
    }

    private processDisplayData(data: any): string {
        if (data instanceof Array) {
            return this.reduceArrayForDisplay(data, 0);
        }
        return "FAILED TO CONVERT FOR DISPLAY";
    }

    output(data: any, over?: number, newLine?: boolean): void {
        newLine = newLine === true;
        let text: string = "";
        if (typeof data !== "string") {
            text = this.processDisplayData(data);
        } else {
            text = data;
        }
        const items: HTMLElement[] = this.breakUptext(text);
        if (newLine) {
            items.push(document.createElement("br"));
        }
        this.writeToDisplay(items, over);
    }

    prompt(show: boolean): void {
        console.log("PROMPT", show);
    }


    private processQueue(): void {
        this.queuedItems.map((item: IQueuedDisplayItem) => {
            this.writeToDisplay(item.text, item.over);
        });
    }

    private createDisplay(): void {
        this.display.id = "output";
        this.display.tabIndex = -1;
        this.input.id = "input";
        this.input.tabIndex = 0;
        this.input.contentEditable = "true";
        this.input.spellcheck = false;
        const body: HTMLBodyElement | null = document.querySelector("body");
        if (body !== null) {
            body.append(this.display);
            this.display.append(this.input);
        }
    }

    private history(dir: 1 | -1): void {
        if (this.processManager !== null) {
            this.processManager.stdIn("user", "§§§DIR§§§" + dir);
        }
    }

    private controlKey(key: String): void {
        if (this.processManager !== null) {
            this.processManager.stdIn("user", "§§§CTRL§§§" + key);
        }
    }

    private enterText(): void {
        const text: string = this.input.textContent || "";
        if (text.length > 0) {
            this.output(text, 0, true);
            if (this.processManager !== null) {
                this.processManager.stdIn("user", text);
            }
            this.input.textContent = "";
        }
    }
}