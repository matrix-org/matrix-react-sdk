import { AsnPropTypes, AsnTypeTypes } from "./enums";
import { IAsnConverter, IEmptyConstructor } from "./types";
export declare type AsnItemType<T = any> = AsnPropTypes | IEmptyConstructor<T>;
export interface IAsn1TypeOptions {
    type: AsnTypeTypes;
    itemType?: AsnItemType;
}
export declare type AsnRepeatTypeString = "sequence" | "set";
export declare type AsnRepeatType = AsnRepeatTypeString;
export interface IAsn1PropOptions {
    type: AsnItemType;
    optional?: boolean;
    defaultValue?: any;
    context?: number;
    implicit?: boolean;
    converter?: IAsnConverter;
    repeated?: AsnRepeatType;
}
export declare const AsnType: (options: IAsn1TypeOptions) => (target: object) => void;
export declare const AsnChoiceType: () => (target: object) => void;
export interface IAsn1SetOptions {
    itemType: AsnItemType;
}
export declare const AsnSetType: (options: IAsn1SetOptions) => (target: object) => void;
export interface IAsn1SequenceOptions {
    itemType?: AsnItemType;
}
export declare const AsnSequenceType: (options: IAsn1SequenceOptions) => (target: object) => void;
export declare const AsnProp: (options: IAsn1PropOptions) => (target: object, propertyKey: string) => void;
