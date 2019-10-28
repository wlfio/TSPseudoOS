import ls from "./ls";
import bash from "./bash";
import mkdir from "./mkdir";
import cat from "./cat";
import touch from "./touch";


export const DefaultApps: { [s: string]: Function } = {
    ls,
    bash,
    mkdir,
    cat,
    touch,
};