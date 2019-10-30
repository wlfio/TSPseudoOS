import Process from "./Process";

export type FunctionSet = { [s: string]: { [s: string]: Function } };
export type OSApi = { [s: string]: { [s: string]: (process:Process, data:any) => Promise<any> } };