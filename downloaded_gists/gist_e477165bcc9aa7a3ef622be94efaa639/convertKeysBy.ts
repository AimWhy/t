type GenKeyFun = (obj: any, key: string, path1: string, path2: string) => string;

export function convertKeysBy(obj: any, fn: GenKeyFun, path = '', path2 = ''): any {
  if (Array.isArray(obj)) {
    return obj.map((item, key) =>
      convertKeysBy(item, fn, path, `${path2 ? path2 + '.' : ''}${key}`)
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      const fullPath = path ? `${path}.${key}` : key;
      const fullPath2 = path2 ? `${path2}.${key}` : key;
      const newKey = fn(obj[key], key, fullPath, fullPath2);
      acc[newKey] = convertKeysBy(obj[key], fn, fullPath, fullPath2);
      return acc;
    }, {} as any);
  }

  return obj;
}
