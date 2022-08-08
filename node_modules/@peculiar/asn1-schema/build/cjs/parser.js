"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsnParser = void 0;
const asn1 = require("asn1js");
const enums_1 = require("./enums");
const converters = require("./converters");
const errors_1 = require("./errors");
const helper_1 = require("./helper");
const storage_1 = require("./storage");
class AsnParser {
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
            if ((0, helper_1.isConvertible)(target)) {
                const value = new target();
                return value.fromASN(asn1Schema);
            }
            const schema = storage_1.schemaStorage.get(target);
            storage_1.schemaStorage.cache(target);
            let targetSchema = schema.schema;
            if (asn1Schema.constructor === asn1.Constructed && schema.type !== enums_1.AsnTypeTypes.Choice) {
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
                throw new errors_1.AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema. ${asn1ComparedSchema.result.error}`);
            }
            const res = new target();
            if ((0, helper_1.isTypeOfArray)(target)) {
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
                if (typeof (schemaItem.type) === "number" || (0, helper_1.isConvertible)(schemaItem.type)) {
                    const converter = (_a = schemaItem.converter) !== null && _a !== void 0 ? _a : ((0, helper_1.isConvertible)(schemaItem.type)
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
                            if ((0, helper_1.isConvertible)(schemaItem.type)) {
                                newItem = new schemaItem.type().toSchema("");
                            }
                            else {
                                const Asn1TypeName = enums_1.AsnPropTypes[schemaItem.type];
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
            if (error instanceof errors_1.AsnSchemaValidationError) {
                error.schemas.push(target.name);
            }
            throw error;
        }
    }
}
exports.AsnParser = AsnParser;
