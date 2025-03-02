const showDirectoryPicker = window.showDirectoryPicker;
class WebFileAccess {
    constructor(path, handle) {
        this.path = path;
        this.handle = handle;
    }
    file() {
        return this.handle.getFile();
    }
    async save(data) {
        const writable = await this.handle.createWritable();
        await writable.write(data);
        await writable.close();
    }
}
class WebDirectoryAccess {
    constructor(handle) {
        this.handle = handle;
    }
    async listFiles() {
        const content = [];
        for await (const entry of this.listDirectoryContents(this.handle)) {
            content.push(entry);
        }
        return content;
    }
    async *listDirectoryContents(dirHandle, basePath = []) {
        for await (const handle of dirHandle.values()) {
            if (handle.kind === 'file') {
                yield new WebFileAccess([...basePath, handle.name].join('/'), handle);
            }
            else if (handle.kind === 'directory') {
                // Skip git storage directory
                if (handle.name === '.git') {
                    continue;
                }
                yield* this.listDirectoryContents(handle, [...basePath, handle.name]);
            }
        }
    }
}
/** @internal */
export class WebFileSystemAccess {
    static isSupported() {
        return Boolean(showDirectoryPicker);
    }
    static async requestDirectoryAccess() {
        if (!showDirectoryPicker) {
            throw new Error('File system access is not supported');
        }
        const handle = await showDirectoryPicker();
        return new WebDirectoryAccess(handle);
    }
    constructor() { }
}