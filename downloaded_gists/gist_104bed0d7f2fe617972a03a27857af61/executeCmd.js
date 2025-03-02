import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { readdir, stat, unlink, rmdir, readFile, writeFile, mkdir, readFileSync } from 'fs/promises';

export function executeCmd(cwd, cmd, args) {
    return new Promise((resolve, reject) => {
        console.log(`[${cwd}] executing: ${cmd} ${args.join(' ')}`);
        const child = spawn(cmd, args, {
            cwd: cwd,
            windowsHide: true,
        });
        child.stdout.on('data', data => process.stdout.write(data.toString()));
        child.stderr.on('data', data => process.stdout.write(data.toString()));
        child.on('error', err => {
            reject(err);
        });
        child.on('exit', code => {
            if (code !== 0) {
                reject(`Exited with code ${code}`);
            }
            resolve(code ? code : 0);
        });
    });
}

export async function findDirRecursive(basePath, filter) {
    let results = [];
    for (const subPathName of await readdir(basePath)) {
        const subPath = path.resolve(`${basePath}/${subPathName}`);
        const fileStat = await stat(subPath);
        if (!fileStat.isDirectory()) {
            continue;
        }
        if (filter(subPath)) {
            results.push(subPath);
        }
        const pathResults = await findDirRecursive(subPath, filter);
        results = results.concat(pathResults);
    }
    return results;
}

export async function findRecursive(basePath, filter) {
    let results = [];
    for (const subPathName of await readdir(basePath)) {
        const subPath = path.resolve(`${basePath}/${subPathName}`);
        const fileStat = await stat(subPath);
        if (fileStat.isDirectory()) {
            const pathResults = await findRecursive(subPath, filter);
            results = results.concat(pathResults);
            continue;
        }
        if (!fileStat.isFile()) {
            continue;
        }
        if (!filter(subPath)) {
            continue;
        }
        results.push(subPath);
    }
    return results;
}

export async function rmdirRecursive(basePath) {
    if (!existsSync(basePath)) {
        return;
    }
    for (const subPathName of await readdir(basePath)) {
        const subPath = path.resolve(`${basePath}/${subPathName}`);
        const fileStat = await stat(subPath);
        if (fileStat.isDirectory()) {
            await rmdirRecursive(subPath);
            continue;
        }
        if (fileStat.isFile()) {
            await unlink(subPath);
            continue;
        }
    }
    await rmdir(basePath);
}

export async function readJsonFile(filePath) {
    const rawContents = await readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(rawContents);
}

export async function writeJsonFile(filePath, json) {
    const rawContents = JSON.stringify(json, null, 2);
    await writeFile(filePath, rawContents, { encoding: 'utf8' });
}

export async function safeMkdir(filePath) {
    if (!existsSync(filePath)) {
        await mkdir(filePath, { recursive: true });
    }
}

export async function safeUnlink(filePath) {
    if (existsSync(filePath)) {
        await unlink(filePath);
    }
}

export async function fileExists(filePath) {
    return existsSync(filePath);
}

// chunker<T>(input: T[], chunks: number): T[][]
export function chunker(input, chunks) {
    const minChunkSize = Math.floor(input.length / chunks);
    let remainder = input.length - (minChunkSize * chunks);
    let position = 0;
    const output = [];

    for (let i = 0; i < chunks; i++) {
        let chunkSize = minChunkSize;
        if (remainder > 0) {
            remainder--;
            chunkSize++;
        }
        const chunk = input.slice(position, position + chunkSize);
        output.push(chunk);
        position += chunkSize;
    }
    return output;
}


export function copyDir(source, targetDir) {
	let files = [];
	const targetFolder = path.join(targetDir, path.basename(source));
	if (!existsSync(targetFolder)) {
		mkdirSync(targetFolder);
	}
	if (lstatSync(source).isDirectory()) {
		files = readdirSync(source);
		files.forEach(function (file) {
			const curSource = path.join(source, file);
			if (lstatSync(curSource).isDirectory()) {
				copyDir(curSource, targetFolder);
			} else {
				copyFile(curSource, targetFolder);
			}
		});
	}
}

export function copyFile(source, targetDir) {
	let targetFile = targetDir;
	if (existsSync(targetDir)) {
		if (lstatSync(targetDir).isDirectory()) {
			targetFile = path.join(targetDir, path.basename(source));
		}
		if (existsSync(targetFile)) {
			targetFile = path.join(targetDir, path.basename(source) + '-copy');
		}
	}
	writeFileSync(targetFile, readFileSync(source));
}