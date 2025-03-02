const keys = (ks) => (Array.isArray(ks) ? ks : ks.split('.'));

export const deepGet = (o, kp) => keys(kp).reduce((o, k) => o && o[k], o);

export const deepSet = (o, kp, v) => keys(kp).reduceRight((v, k, i, ks) => Object.assign({}, deepGet(o, ks.slice(0, i)), { [k]: v }), v);

