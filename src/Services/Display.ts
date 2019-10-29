import ProcessManager from "./ProcessManager";

interface IQueuedDisplayItem {
    text: any[];
    over: number;
}

export interface IDisplay {
    init(pm: ProcessManager): void;
    setText(text: string): void;
    output(data: any, over?: number, newLine?: boolean): void;
    info(): Promise<any>;
}

export default class Display implements IDisplay {
    display: HTMLDivElement;
    input: HTMLSpanElement;

    queuedItems: IQueuedDisplayItem[] = [];

    processManager: ProcessManager | null = null;

    constructor() {
        this.display = document.createElement("div");
        this.input = document.createElement("span");
    }

    info(): Promise<any> {
        return Promise.resolve({});
    }

    init(processManager: ProcessManager): void {
        this.processManager = processManager;
        this.createDisplay();
        document.addEventListener("keydown", () => {
            if (document.activeElement !== this.input) {
                this.input.focus();
            }
        });

        this.input.addEventListener("keydown", (ev: KeyboardEvent) => {
            if (ev.ctrlKey && ev.key !== "Control" && !ev.repeat && ev.key !== "F5") {
                this.controlKey(ev.key);
            } else if ((ev.key === "ArrowUp" || ev.key === "ArrowDown") && !ev.repeat) {
                this.history(ev.key === "ArrowDown" ? -1 : 1);
            } else if (ev.key === "Enter") {
                if (!ev.repeat) {
                    this.enterText();
                }
            } else if (ev.key === "Tab") {
                this.tabKey();
                console.log("TAB KEY");
                ev.preventDefault();
            } else {
                return;
            }
            ev.preventDefault();
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
        console.log(data);
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
        this.specialUserInput("DIR", dir.toString());
    }

    private controlKey(key: string): void {
        this.inputOutput(false);
        this.specialUserInput("CTRL", key);
    }

    public setText(text: string): void {
        this.input.textContent = text;
        const range = document.createRange() || new Range();
        var sel: Selection = window.getSelection() || new Selection();
        const childs = this.input.childNodes;
        console.log("DISPLAY", childs[childs.length - 1]);
        if (text.length > 0) {
            range.setStart(childs[childs.length - 1], this.input.textContent.length);
        } else {
            range.setStart(this.input, this.input.textContent.length);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        this.input.focus();
        // const range = document.createRange();//Create a range (a range is a like the selection but invisible)
        // range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
        // range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
        // selection = window.getSelection();//get the selection object (allows you to change selection)
        // selection.removeAllRanges();//remove any selections already made
        // selection.addRange(range);
    }

    private enterText(): void {
        const text: string = this.inputOutput();
        if (text.length > 0) {
            this.userInput(text);
            this.setText("");
        }
    }

    private inputOutput(newLine?: boolean): string {
        newLine = newLine !== false;
        const text: string = this.input.textContent || "";
        if (text.length > 0) {
            this.output(text, 0, newLine);
        }
        return text;
    }

    private specialUserInput(type: string, text: string): void {
        this.userInput("§§§" + type + "§§§" + text);
    }

    private userInput(text: string): void {
        if (this.processManager !== null) {
            this.processManager.stdIn("user", text);
        }
    }

    private tabKey() {
        this.specialUserInput("tab", this.input.textContent || "");
    }
}