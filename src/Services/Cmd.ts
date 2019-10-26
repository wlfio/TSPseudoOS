import { ILibCMD } from "./Cmd";

export interface ILibCMD {
    Colours: ILibCMDColours;
    Colourize(text: string, fore: string, back?: string): string;
}

export interface ILibCMDColours {
    red: "F00";
    green: "0F0";
    blue: "23F";
    black: "000";
    white: "FFF";
    lightBlue: "38F";
}

const testColourHex: Function = (text: string): boolean => {
    const re: RegExp = /[0-9A-F]{3}/g;
    return re.test(text);
};

const hexCheck: Function = (text: string, name: string): void => {
    if (!testColourHex(text)) {
        throw new Error(["CMD Error", name, "Must be 3 hex chars"].join(" : "));
    }
};

const CMD: ILibCMD = {
    Colours: {
        red: "F00",
        green: "0F0",
        blue: "23F",
        black: "000",
        white: "FFF",
        lightBlue: "38F",
    },
    Colourize: (text: string, fore: string, back?: string) => {
        back = back || "000";
        back = back.toUpperCase();
        fore = fore.toUpperCase();
        hexCheck(fore);
        hexCheck(back);
        return "§" + fore + back + text;
    }
};

export default CMD;