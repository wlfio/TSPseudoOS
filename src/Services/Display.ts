
let display: HTMLPreElement | null = null;

interface QueuedDisplayItem {
    text: string;
    over: number;
}

const queuedItems: QueuedDisplayItem[] = [];


const processQueue: Function = () => {
    queuedItems.map((item: QueuedDisplayItem) => { writeToDisplay(item.text, item.over) });
}

const reduceArrayForDisplay: Function = (data: Array<any>, level: number): string => {
    return data.reduce((out: string, inp: any, index: number) => {
        const type = typeof inp;
        if (type === "string" || type === "number") {
            out += (index < 1 ? "" : "\t") + inp;
        } else {
            if (inp instanceof Array) {
                out += reduceArrayForDisplay(inp, level + 1) + "\n";
            }
        }
        return out;
    }, "");
}

const processDisplayData: Function = (data: any): string => {
    if (data instanceof Array) {
        return reduceArrayForDisplay(data, 0);
    }
    return "FAILED TO CONVERT FOR DISPLAY";
}

export const output: Function = (data: any, over?: number, newLine?: boolean) => {
    console.log("OUTPUT", data, over, newLine);
    newLine = newLine === true;
    let text: string = "";
    if (typeof data !== "string") {
        text = processDisplayData(data);
    } else {
        text = data;
    }
    writeToDisplay(text + (newLine ? "\n" : ""), over);
}

export const prompt: Function = (show: boolean) => {

}

const writeToDisplay: Function = (text: string, over?: number) => {
    over = over || 0;
    if (display === null) {
        console.log("Queueing for display", text, over);
        queuedItems.push({ text, over });
    } else {
        display.textContent = display.textContent + text;
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    display = document.querySelector("pre#output");
    processQueue();
});

export default {
    output,
}