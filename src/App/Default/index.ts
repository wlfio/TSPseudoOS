import ls from "./ls";
import shell from "./shell";
import mkdir from "./mkdir";
import cat from "./cat";
import touch from "./touch";
import rm from "./rm";
import cd from "./cd";
import tail from "./tail";
import head from "./head";
import edit from "./edit";
import help from "./help";

export const DefaultApps: { [s: string]: Function } = {
    ls,
    shell,
    mkdir,
    cat,
    touch,
    rm,
    cd,
    tail,
    head,
    edit,
    help,
};