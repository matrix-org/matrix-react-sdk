import * as asn1 from "asn1js";
import { AsnRepeatType } from "./decorators";
import { AsnPropTypes, AsnTypeTypes } from "./enums";
import { IAsnConverter, IEmptyConstructor } from "./types";
export interface IAsnSchemaItem {
    type: AsnPropTypes | IEmptyConstructor<any>;
    optional?: boolean;
    defaultValue?: any;
    context?: number;
    implicit?: boolean;
    converter?: IAsnConverter;
    repeated?: AsnRepeatType;
}
export interface IAsnSchema {
    type: AsnTypeTypes;
    itemType: AsnPropTypes | IEmptyConstructor<any>;
    items: {
        [key: string]: IAsnSchemaItem;
    };
    schema?: any;
}
export declare class AsnSchemaStorage {
    protected items: WeakMap<object, IAsnSchema>;
    has(target: object): boolean;
    get(target: object): IAsnSchema;
    cache(target: object): void;
    createDefault(target: object): IAsnSchema;
    create(target: object, useNames: boolean): asn1.Sequence | asn1.Set | asn1.Choice;
    set(target: object, schema: IAsnSchema): this;
    protected findParentSchema(target: object): IAsnSchema | null;
}
