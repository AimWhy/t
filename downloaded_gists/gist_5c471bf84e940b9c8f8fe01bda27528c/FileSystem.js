import { v4 as uuidv4 } from 'uuid';

class FileSystem {
	static #instance;

	#fileSystemTree = [];
	#rootHandler;
	#fileTable = {};
	#searchTable = {};

	constructor() {
		if (FileSystem.#instance) {
			return FileSystem.#instance;
		}
		FileSystem.#instance = this;
	}

	#compareFileSystemTree = (first, second) => {
		if (first.handle.kind !== second.handle.kind) {
			return first.handle.kind === "directory" ? -1 : 1;
		} else {
			let compA = first.handle.name.toLocaleLowerCase();
			let compB = second.handle.name.toLocaleLowerCase();
			return compA.localeCompare(compB) > 0 ? -1 : 1;
		}
	};

	#setRootHandler = (rootHandler) => { this.#rootHandler = rootHandler; };

	#recursiveScanFolder = async (ancestor = this.#rootHandler) => {
		let node;
		let uuid;
		const dirHandle = ancestor.handle;
		try {
			const entries = dirHandle.entries();
			for await (let [_, handle] of entries) {
				uuid = uuidv4();
				if (handle.kind === "directory") {
					node = {
						handle: handle,
						id: uuid,
						ancestor: ancestor,
						children: []
					};
					await this.#recursiveScanFolder.call(this, node);
				} else {
					node = {
						handle: handle,
						id: uuid,
						ancestor: ancestor,
					};
				}
				ancestor['children'].push(node);
				ancestor['children'].sort(this.#compareFileSystemTree);
				this.#searchTable[uuid] = node;
			}
		} catch {
		}
		return ancestor;
	};

	#findNodeFromPath(path, fileSystemTree, returnDirectoryIfNotFound = false) {
		if (!path) {
			return null;
		}
		let fileName = path.pop();
		let treeNode = fileSystemTree[0];
		let folderNode;

		for (let folderName of path) {
			folderNode = treeNode.children.find(node => node.handle.kind === "directory" && node.handle.name === folderName);
			if (folderNode) {
				treeNode = folderNode;
			} else {
				return null;
			}
		}

		let fileNode = treeNode.children.find(node => node.handle.kind === "file" && node.handle.name === fileName);
		if (fileNode) {
			return fileNode;
		} else {
			if (returnDirectoryIfNotFound === false) {
				return null;
			} else {
				return treeNode;
			}
		}
	}

	async #removeRepeatedFilesOpened(handlers, fileTable) {
		if (Object.keys(fileTable).length === 0) {
			return handlers;
		}

		let fileHandlerArray = Object.values(fileTable).filter(file => file);
		let clearedHandlers = [];

		for (let handler of handlers) {
			let repeated = false;
			for (let fileHandler of fileHandlerArray) {
				let isSameEntry = await fileHandler.isSameEntry(handler);
				if (isSameEntry) {
					repeated = true;
					break;
				}
			}
			if (!repeated) {
				clearedHandlers.push(handler);
			}
		}
		return clearedHandlers;
	}

	getFileSystemTree() {
		return this.#fileSystemTree;
	}
	getSearchTable() {
		return this.#searchTable;
	}
	getFileTable() {
		return this.#fileTable;
	}
	getRootHandler() {
		return this.#rootHandler;
	}
	findIdFromSearchTable(id) {
		return this.#searchTable[id];
	}
	idToFileHandler(id) {
		if (this.#fileTable[id]) {
			return this.#fileTable[id];
		}
		if (this.#searchTable[id]) {
			const fileNode = this.#searchTable[id];
			return fileNode.handle;
		}
		return null;
	}
	createNewFilePlaceHolder() {
		const id = uuidv4();
		this.#fileTable[id] = null;
		return id;
	}
	async importFolder() {
		this.#fileSystemTree = [];
		this.#searchTable = {};
		const rootNode = {
			handle: this.#rootHandler,
			id: uuidv4(),
			children: []
		};
		this.#searchTable[rootNode.id] = rootNode;
		this.#searchTable['rootId'] = rootNode.id;
		await this.#recursiveScanFolder.call(this, rootNode);
		this.#fileSystemTree.push(rootNode);
	}
	async addFileInfo(fileHandler) {
		let path = await this.#rootHandler?.resolve(fileHandler);
		if (!path) {
			return null;
		}

		const treeNode = this.#findNodeFromPath(path, this.#fileSystemTree, true);
		if ("children" in treeNode) {
			const newId = uuidv4();
			const newNode = {
				id: newId,
				handle: fileHandler,
				ancestor: treeNode
			};
			treeNode.children[newId] = newNode;
			this.#searchTable[newId] = newNode;
			return newId;
		} else {
			return treeNode.id;
		}

	}
	async getFileInfo(fileHandlers, ids) {
		console.log(this.#fileTable, this.#searchTable);
		const fileInfoArray = [];
		fileHandlers = await this.#removeRepeatedFilesOpened(fileHandlers, this.#fileTable);
		console.log(fileHandlers, 1);

		if (!ids || ids.length !== fileHandlers.length) {
			for (let fileHandler of fileHandlers) {
				let file = await fileHandler.getFile();
				let content = await file.text();
				let path = await this.#rootHandler?.resolve(fileHandler);
				let uuid;
				if (path) {
					let fileNode = this.#findNodeFromPath(path, this.#fileSystemTree);
					uuid = fileNode.id;
					fileInfoArray.push({
						name: fileHandler.name,
						content: content,
						type: "infolder",
						id: uuid
					});
				}
				else {
					uuid = uuidv4();
					fileInfoArray.push({
						name: fileHandler.name,
						content: content,
						type: "standalone",
						id: uuid
					});
				}
				this.#fileTable[uuid] = fileHandler;
			}
		}
		else {
			for (let i = 0; i < fileHandlers.length; i++) {
				let file = await fileHandlers[i].getFile();
				let content = await file.text();
				let uuid = ids[i];
				fileInfoArray.push({
					name: fileHandlers[i].name,
					content: content,
					type: "infolder",
					id: uuid
				});
				this.#fileTable[uuid] = fileHandlers[i];
			}
		}
		return fileInfoArray;
	}
	removeFileFromFileTable(id) {
		delete this.#fileTable[id];
	}
	//may need some garbage entry cleaning mechanics
	updateFileTable(oldId, newId, newfileHandles) {
		if (newId.length === 0 || newfileHandles.length !== newId.length)
			return false;
		if (oldId.length > 0) {
			for (let i = 0; i < oldId.length; i++) {
				if (oldId[i] in this.#fileTable) {
					delete this.#fileTable[oldId[i]];
				}
			}
		}
		for (let i = 0; i < newId.length; i++) {
			if (!(newId[i] in this.#fileTable)) {
				this.#fileTable[newId[i]] = newfileHandles[i];
			}
		}
		return true;
	}
	async writeToFile(fileHandle, contents) {
		// Create a FileSystemWritableFileStream to write to.
		const writable = await fileHandle.createWritable();
		// Write the contents of the file to the stream.
		await writable.write(contents);
		// Close the file and write the contents to disk.
		await writable.close();
	}

	static {
		this.getRootDirectoryHandler = async () => {
			const rootHandler = await window.showDirectoryPicker();
			FileSystem.#instance.#setRootHandler(rootHandler);
			return rootHandler;
		};
	}
	static {
		this.getFileHandler = async () => {
			return await window.showOpenFilePicker();
		};
	}
	static { this.showRootHandler = () => FileSystem.#instance.getRootHandler(); }
	static async getNewFileHandle() {
		const handle = await window.showSaveFilePicker();
		return handle;
	}
}
export default FileSystem;
export const FileSystemInstance = new FileSystem();