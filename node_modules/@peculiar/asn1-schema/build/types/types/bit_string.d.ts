import { BitString as AsnBitString } from "asn1js";
import { BufferSource } from "pvtsutils";
import { IAsnConvertible } from "../types";
export declare class BitString<T extends number = number> implements IAsnConvertible {
    unusedBits: number;
    value: ArrayBuffer;
    constructor();
    constructor(value: T);
    constructor(value: BufferSource, unusedBits?: number);
    fromASN(asn: any): this;
    toASN(): AsnBitString;
    toSchema(name: string): AsnBitString;
    toNumber(): T;
    fromNumber(value: T): void;
}
