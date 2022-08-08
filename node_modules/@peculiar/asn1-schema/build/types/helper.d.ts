import { IAsnConvertible } from "./types";
export declare function isConvertible(target: any): target is IAsnConvertible<any>;
export declare function isTypeOfArray(target: any): target is typeof Array;
export declare function isArrayEqual(bytes1: ArrayBuffer, bytes2: ArrayBuffer): boolean;
