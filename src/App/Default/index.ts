import ls from "./ls";
import bash from "./bash";
import mkdir from "./mkdir";
import cat from "./cat";
import touch from "./touch";
import rm from "./rm";
import cd from "./cd";


export const DefaultApps: { [s: string]: Function } = {
    ls,
    bash,
    mkdir,
    cat,
    touch,
    rm,
    cd,
};