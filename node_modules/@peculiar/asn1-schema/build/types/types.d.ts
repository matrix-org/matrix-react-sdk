/**
 * ASN1 type
 */
import * as asn1 from "asn1js";
export interface IEmptyConstructor<T> {
    new (): T;
}
/**
 * Allows to convert ASN.1 object to JS value and back
 */
export interface IAsnConverter<T = any, AsnType = any> {
    /**
     * Returns JS value from ASN.1 object
     * @param value ASN.1 object from asn1js module
     */
    fromASN(value: AsnType): T;
    /**
     * Returns ASN.1 object from JS value
     * @param value JS value
     */
    toASN(value: T): AsnType;
}
export declare type IntegerConverterType = string | number;
export declare type AnyConverterType = ArrayBuffer | null;
/**
 * Allows an object to control its own ASN.1 serialization and deserialization
 */
export interface IAsnConvertible<T = any> {
    fromASN(asn: T): this;
    toASN(): T;
    toSchema(name: string): asn1.BaseBlock<any>;
}
