import ls from "./ls";
import bash from "./bash";
import mkdir from "./mkdir";
import cat from "./cat";

export const DefaultApps: { [s: string]: Function } = {
    ls,
    bash,
    mkdir,
    cat,
};