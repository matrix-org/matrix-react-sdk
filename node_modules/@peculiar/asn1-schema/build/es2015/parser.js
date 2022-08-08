import * as asn1 from "asn1js";
import { AsnPropTypes, AsnTypeTypes } from "./enums";
import * as converters from "./converters";
import { AsnSchemaValidationError } from "./errors";
import { isConvertible, isTypeOfArray } from "./helper";
import { schemaStorage } from "./storage";
export class AsnParser {
    static parse(data, target) {
        const asn1Parsed = asn1.fromBER(data);
        if (asn1Parsed.result.error) {
            throw new Error(asn1Parsed.result.error);
        }
        const res = this.fromASN(asn1Parsed.result, target);
        return res;
    }
    static fromASN(asn1Schema, target) {
        var _a;
        try {
            if (isConvertible(target)) {
                const value = new target();
                return value.fromASN(asn1Schema);
            }
            const schema = schemaStorage.get(target);
            schemaStorage.cache(target);
            let targetSchema = schema.schema;
            if (asn1Schema.constructor === asn1.Constructed && schema.type !== AsnTypeTypes.Choice) {
                targetSchema = new asn1.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: asn1Schema.idBlock.tagNumber,
                    },
                    value: schema.schema.valueBlock.value,
                });
                for (const key in schema.items) {
                    delete asn1Schema[key];
                }
            }
            const asn1ComparedSchema = asn1.compareSchema({}, asn1Schema, targetSchema);
            if (!asn1ComparedSchema.verified) {
                throw new AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema. ${asn1ComparedSchema.result.error}`);
            }
            const res = new target();
            if (isTypeOfArray(target)) {
                if (typeof schema.itemType === "number") {
                    const converter = converters.defaultConverter(schema.itemType);
                    if (!converter) {
                        throw new Error(`Cannot get default converter for array item of ${target.name} ASN1 schema`);
                    }
                    return target.from(asn1Schema.valueBlock.value, (element) => converter.fromASN(element));
                }
                else {
                    return target.from(asn1Schema.valueBlock.value, (element) => this.fromASN(element, schema.itemType));
                }
            }
            for (const key in schema.items) {
                const asn1SchemaValue = asn1ComparedSchema.result[key];
                if (!asn1SchemaValue) {
                    continue;
                }
                const schemaItem = schema.items[key];
                if (typeof (schemaItem.type) === "number" || isConvertible(schemaItem.type)) {
                    const converter = (_a = schemaItem.converter) !== null && _a !== void 0 ? _a : (isConvertible(schemaItem.type)
                        ? new schemaItem.type()
                        : null);
                    if (!converter) {
                        throw new Error("Converter is empty");
                    }
                    if (schemaItem.repeated) {
                        if (schemaItem.implicit) {
                            const Container = schemaItem.repeated === "sequence"
                                ? asn1.Sequence
                                : asn1.Set;
                            const newItem = new Container();
                            newItem.valueBlock = asn1SchemaValue.valueBlock;
                            const value = asn1.fromBER(newItem.toBER(false)).result.valueBlock.value;
                            res[key] = Array.from(value, (element) => converter.fromASN(element));
                        }
                        else {
                            res[key] = Array.from(asn1SchemaValue, (element) => converter.fromASN(element));
                        }
                    }
                    else {
                        let value = asn1SchemaValue;
                        if (schemaItem.implicit) {
                            let newItem;
                            if (isConvertible(schemaItem.type)) {
                                newItem = new schemaItem.type().toSchema("");
                            }
                            else {
                                const Asn1TypeName = AsnPropTypes[schemaItem.type];
                                const Asn1Type = asn1[Asn1TypeName];
                                if (!Asn1Type) {
                                    throw new Error(`Cannot get '${Asn1TypeName}' class from asn1js module`);
                                }
                                newItem = new Asn1Type();
                            }
                            newItem.valueBlock = value.valueBlock;
                            value = asn1.fromBER(newItem.toBER(false)).result;
                        }
                        res[key] = converter.fromASN(value);
                    }
                }
                else {
                    if (schemaItem.repeated) {
                        res[key] = Array.from(asn1SchemaValue, (element) => this.fromASN(element, schemaItem.type));
                    }
                    else {
                        res[key] = this.fromASN(asn1SchemaValue, schemaItem.type);
                    }
                }
            }
            return res;
        }
        catch (error) {
            if (error instanceof AsnSchemaValidationError) {
                error.schemas.push(target.name);
            }
            throw error;
        }
    }
}
