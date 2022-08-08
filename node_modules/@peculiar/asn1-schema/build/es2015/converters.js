import * as asn1 from "asn1js";
import { AsnPropTypes } from "./enums";
export const AsnAnyConverter = {
    fromASN: (value) => value instanceof asn1.Null ? null : value.valueBeforeDecode,
    toASN: (value) => {
        if (value === null) {
            return new asn1.Null();
        }
        const schema = asn1.fromBER(value);
        if (schema.result.error) {
            throw new Error(schema.result.error);
        }
        return schema.result;
    },
};
export const AsnIntegerConverter = {
    fromASN: (value) => value.valueBlock.valueHexView.byteLength >= 4
        ? value.valueBlock.toString()
        : value.valueBlock.valueDec,
    toASN: (value) => new asn1.Integer({ value: value }),
};
export const AsnEnumeratedConverter = {
    fromASN: (value) => value.valueBlock.valueDec,
    toASN: (value) => new asn1.Enumerated({ value }),
};
export const AsnIntegerArrayBufferConverter = {
    fromASN: (value) => value.valueBlock.valueHex,
    toASN: (value) => new asn1.Integer({ valueHex: value }),
};
export const AsnIntegerBigIntConverter = {
    fromASN: (value) => value.toBigInt(),
    toASN: (value) => asn1.Integer.fromBigInt(value),
};
export const AsnBitStringConverter = {
    fromASN: (value) => value.valueBlock.valueHex,
    toASN: (value) => new asn1.BitString({ valueHex: value }),
};
export const AsnObjectIdentifierConverter = {
    fromASN: (value) => value.valueBlock.toString(),
    toASN: (value) => new asn1.ObjectIdentifier({ value }),
};
export const AsnBooleanConverter = {
    fromASN: (value) => value.valueBlock.value,
    toASN: (value) => new asn1.Boolean({ value }),
};
export const AsnOctetStringConverter = {
    fromASN: (value) => value.valueBlock.valueHex,
    toASN: (value) => new asn1.OctetString({ valueHex: value }),
};
function createStringConverter(Asn1Type) {
    return {
        fromASN: (value) => value.valueBlock.value,
        toASN: (value) => new Asn1Type({ value }),
    };
}
export const AsnUtf8StringConverter = createStringConverter(asn1.Utf8String);
export const AsnBmpStringConverter = createStringConverter(asn1.BmpString);
export const AsnUniversalStringConverter = createStringConverter(asn1.UniversalString);
export const AsnNumericStringConverter = createStringConverter(asn1.NumericString);
export const AsnPrintableStringConverter = createStringConverter(asn1.PrintableString);
export const AsnTeletexStringConverter = createStringConverter(asn1.TeletexString);
export const AsnVideotexStringConverter = createStringConverter(asn1.VideotexString);
export const AsnIA5StringConverter = createStringConverter(asn1.IA5String);
export const AsnGraphicStringConverter = createStringConverter(asn1.GraphicString);
export const AsnVisibleStringConverter = createStringConverter(asn1.VisibleString);
export const AsnGeneralStringConverter = createStringConverter(asn1.GeneralString);
export const AsnCharacterStringConverter = createStringConverter(asn1.CharacterString);
export const AsnUTCTimeConverter = {
    fromASN: (value) => value.toDate(),
    toASN: (value) => new asn1.UTCTime({ valueDate: value }),
};
export const AsnGeneralizedTimeConverter = {
    fromASN: (value) => value.toDate(),
    toASN: (value) => new asn1.GeneralizedTime({ valueDate: value }),
};
export const AsnNullConverter = {
    fromASN: (value) => null,
    toASN: (value) => {
        return new asn1.Null();
    },
};
export function defaultConverter(type) {
    switch (type) {
        case AsnPropTypes.Any:
            return AsnAnyConverter;
        case AsnPropTypes.BitString:
            return AsnBitStringConverter;
        case AsnPropTypes.BmpString:
            return AsnBmpStringConverter;
        case AsnPropTypes.Boolean:
            return AsnBooleanConverter;
        case AsnPropTypes.CharacterString:
            return AsnCharacterStringConverter;
        case AsnPropTypes.Enumerated:
            return AsnEnumeratedConverter;
        case AsnPropTypes.GeneralString:
            return AsnGeneralStringConverter;
        case AsnPropTypes.GeneralizedTime:
            return AsnGeneralizedTimeConverter;
        case AsnPropTypes.GraphicString:
            return AsnGraphicStringConverter;
        case AsnPropTypes.IA5String:
            return AsnIA5StringConverter;
        case AsnPropTypes.Integer:
            return AsnIntegerConverter;
        case AsnPropTypes.Null:
            return AsnNullConverter;
        case AsnPropTypes.NumericString:
            return AsnNumericStringConverter;
        case AsnPropTypes.ObjectIdentifier:
            return AsnObjectIdentifierConverter;
        case AsnPropTypes.OctetString:
            return AsnOctetStringConverter;
        case AsnPropTypes.PrintableString:
            return AsnPrintableStringConverter;
        case AsnPropTypes.TeletexString:
            return AsnTeletexStringConverter;
        case AsnPropTypes.UTCTime:
            return AsnUTCTimeConverter;
        case AsnPropTypes.UniversalString:
            return AsnUniversalStringConverter;
        case AsnPropTypes.Utf8String:
            return AsnUtf8StringConverter;
        case AsnPropTypes.VideotexString:
            return AsnVideotexStringConverter;
        case AsnPropTypes.VisibleString:
            return AsnVisibleStringConverter;
        default:
            return null;
    }
}
