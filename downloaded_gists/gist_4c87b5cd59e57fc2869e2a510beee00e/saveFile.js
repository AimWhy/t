const fileHandle = null;
const currentFile = {}

function setFile(file) {
	currentFile.name = file.name;
	currentFile.ext = file.name.split('.').pop();
}

function readFile(file) {
	const reader = new FileReader();
	reader.onload = (e) => {
		currentFile.content = e.target.result
	};
	reader.readAsText(file);
}

async function openFile() {
	if (supportsFilePicker) {
		[fileHandle] = await showOpenFilePicker({ multiple: false });
		fileData = await fileHandle.getFile();
		readFile(fileData);
		setFile(fileData);
	} else {
		let input = document.createElement('input');
		input.type = 'file';
		input.onchange = (e) => {
			readFile(e.target.files[0]);
			setFile(e.target.files[0]);
		};
		input.click();
		input.remove();
	}
}

async function saveFile(content) {
	if (supportsFilePicker) {
		if (fileHandle) {
			const writableStream = await fileHandle.createWritable();
			await writableStream.write(content);
			await writableStream.close();
			currentFile.content = content;
		} else {
			fileHandle = await showSaveFilePicker();
			const fileData = await fileHandle.getFile()
			readFile(fileData);
			setFile(fileData);
			return saveFile(content);
		}
	} else {
		const blobData = new Blob([content], { type: 'text/${currentFile.ext}' });
		const urlToBlob = window.URL.createObjectURL(blobData);
		const a = document.createElement('a');
		a.style.setProperty('display', 'none');
		a.href = urlToBlob;
		a.download = document.title;
		a.click();
		window.URL.revokeObjectURL(urlToBlob);
		a.remove();
	}
}