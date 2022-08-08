/*
IE11 support
 */
export const toArray = (a) => {
    const ret = Array(a.length);
    for (let i = 0; i < a.length; ++i) {
        ret[i] = a[i];
    }
    return ret;
};
export const asArray = (a) => (Array.isArray(a) ? a : [a]);
