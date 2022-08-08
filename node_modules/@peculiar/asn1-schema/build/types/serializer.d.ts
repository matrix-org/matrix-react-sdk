/**
 * Serializes objects into ASN.1 encoded data
 */
export declare class AsnSerializer {
    /**
     * Serializes an object to the ASN.1 encoded buffer
     * @param obj The object to serialize
     */
    static serialize(obj: any): ArrayBuffer;
    /**
     * Serialize an object to the asn1js object
     * @param obj The object to serialize
     */
    static toASN(obj: any): any;
    private static toAsnItem;
}
