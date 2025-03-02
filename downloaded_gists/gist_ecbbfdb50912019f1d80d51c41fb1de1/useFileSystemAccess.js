import { computed, ref, watch, toValue } from 'vue';

const WebFileSystemAccess = {
    supported: 'showSaveFilePicker' in window && 'showOpenFilePicker' in window,
    isFileSystemHandle(handle) {
        const candidate = handle;
        if (!candidate) {
            return false;
        }
        return typeof candidate.kind === 'string' && typeof candidate.queryPermission === 'function' && typeof candidate.requestPermission === 'function';
    },
    isFileSystemFileHandle(handle) {
        return handle.kind === 'file';
    },
    isFileSystemDirectoryHandle(handle) {
        return handle.kind === 'directory';
    }
};

export function useFileSystemAccess(options = {}) {
    const { dataType = 'Text', } = options;
    const isSupported = WebFileSystemAccess.supported;
    const fileHandle = ref();
    const data = ref();
    const file = ref();
    const fileName = computed(() => file.value?.name ?? '');
    const fileMIME = computed(() => file.value?.type ?? '');
    const fileSize = computed(() => file.value?.size ?? 0);
    const fileLastModified = computed(() => file.value?.lastModified ?? 0);
    async function open(_options = {}) {
        if (!isSupported.value)
            return;
        const [handle] = await window.showOpenFilePicker({ ...toValue(options), ..._options });
        fileHandle.value = handle;
        await updateData();
    }
    async function create(_options = {}) {
        if (!isSupported.value)
            return;
        fileHandle.value = await window.showSaveFilePicker({ ...options, ..._options });
        data.value = undefined;
        await updateData();
    }
    async function save(_options = {}) {
        if (!isSupported.value)
            return;
        if (!fileHandle.value)
            // save as
            return saveAs(_options);
        if (data.value) {
            const writableStream = await fileHandle.value.createWritable();
            await writableStream.write(data.value);
            await writableStream.close();
        }
        await updateFile();
    }
    async function saveAs(_options = {}) {
        if (!isSupported.value)
            return;
        fileHandle.value = await window.showSaveFilePicker({ ...options, ..._options });
        if (data.value) {
            const writableStream = await fileHandle.value.createWritable();
            await writableStream.write(data.value);
            await writableStream.close();
        }
        await updateFile();
    }
    async function updateFile() {
        file.value = await fileHandle.value?.getFile();
    }
    async function updateData() {
        await updateFile();
        const type = toValue(dataType);
        if (type === 'Text')
            data.value = await file.value?.text();
        else if (type === 'ArrayBuffer')
            data.value = await file.value?.arrayBuffer();
        else if (type === 'Blob')
            data.value = file.value;
    }
    watch(() => toValue(dataType), updateData);
    return {
        isSupported,
        data,
        file,
        fileName,
        fileMIME,
        fileSize,
        fileLastModified,
        open,
        create,
        save,
        saveAs,
        updateData,
    };
}