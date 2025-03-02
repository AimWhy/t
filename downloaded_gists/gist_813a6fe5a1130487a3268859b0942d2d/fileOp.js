/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import fse from 'fs-extra'

import { fileURLToPath } from 'url'

export function getDirPath(url) {
  const __filename = fileURLToPath(url)
  const __dirname = path.dirname(__filename)
  return __dirname
}

// 递归遍历目录并获取文件和文件夹信息
export function traverseDirectory(directoryPath) {
  const result = {
    directories: [],
    files: []
  }

  function traverse(currentPath) {
    const contents = fs.readdirSync(currentPath)

    contents.forEach((item) => {
      const itemPath = path.join(currentPath, item)
      const isDirectory = fs.statSync(itemPath).isDirectory()

      if (isDirectory) {
        result.directories.push(itemPath)
        traverse(itemPath) // 递归遍历子目录
      } else {
        result.files.push(itemPath)
      }
    })
  }

  traverse(directoryPath)

  return result
}

/**
 * 复制文件
 */
function copy(src, dst) {
  fs.createReadStream(src).pipe(fs.createWriteStream(dst))
}

function travel(dir, callback, finish) {
  fs.readdir(dir, (err, files) => {
    ; (function next(i) {
      if (i < files.length) {
        var pathname = path.join(dir, files[i])

        fs.stat(pathname, (err, stats) => {
          if (stats.isDirectory()) {
            travel(pathname, callback, function () {
              next(i + 1)
            })
          } else {
            callback(pathname, () => {
              next(i + 1)
            })
          }
        })
      } else {
        finish && finish()
      }
    })(0)
  })
}

export const uuidv4 = () => {
  return crypto.randomUUID()
}

export function genPromise() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function HexStr2Buffer(hex) {
  let buffer = new ArrayBuffer(hex.length / 2)

  let byteStream = new Uint8Array(buffer)

  let i = 0

  while (hex.length >= 2) {
    let x = parseInt(hex.substring(0, 2), 16)

    hex = hex.substring(2, hex.length)

    byteStream[i++] = x
  }

  return buffer
}

export async function mergeFiles(inputFilePaths, outputFilePath) {
  const { resolve, promise, reject } = genPromise()
  const writeStream = fs.createWriteStream(outputFilePath)
  streamMergeRecursive(inputFilePaths, writeStream, resolve, reject)
  return promise
}

/**
 * Stream 合并的递归调用
 * @param { Array } sourceFileArray
 * @param { Stream } fileWriteStream
 */
function streamMergeRecursive(sourceFileArray = [], fileWriteStream: fs.WriteStream, resolve, reject) {
  // 递归到尾部情况判断
  if (!sourceFileArray.length) {
    resolve()
    return fileWriteStream.end(); // 最后关闭可写流，防止内存泄漏
  }

  const currentFile = sourceFileArray.shift();
  const currentReadStream = fs.createReadStream(currentFile); // 获取当前的可读流

  currentReadStream.pipe(fileWriteStream, { end: false });
  currentReadStream.on('end', function () {
    streamMergeRecursive(sourceFileArray, fileWriteStream, resolve, reject);
  });

  currentReadStream.on('error', function (error) { // 监听错误事件，关闭可写流，防止内存泄漏
    console.error(error);
    fileWriteStream.close();
  });
}

/**
 * 把时间轴从秒转成毫秒
*/
export const convertSecondToTime = (second) => {
  // 1703487997000
  if ((second + '').length == 10) {
    return second * 1000
  } else {
    return second
  }
}

export const convertTimeToSecond = (time: number) => {
  if ((time + '').length == 13) {
    return parseInt((time / 1000) + '')
  }
  return time
}


/**
 * 产生新的名字
*/
export const genNewFilePath = (sourceFilePathPath, fullPath: string, suffix: number) => {
  let tmp = path.parse(fullPath)
  let name = `${tmp.name}_${suffix}${tmp.ext}`
  let newFullPath = path.join(tmp.dir, name)
  let existInSource = fs.existsSync(path.join(sourceFilePathPath, name))
  if (fs.existsSync(newFullPath) && !existInSource) {
    return genNewFilePath(sourceFilePathPath, fullPath, suffix + 1)
  }
  return newFullPath
}



export function getVirtualRootPath() {
  return '..'
}

export function getVirtualRootName(basePath) {
  return path.basename(basePath);
}

export function toVirtualFullPath(basePath, absolutePath) {
  return path.relative(path.join(path.dirname(basePath), 'temp'), absolutePath)
}

export function toVirtualPath(basePath, absolutePath) {
  const virtualFullPath = toVirtualFullPath(basePath, absolutePath)
  return path.dirname(virtualFullPath);
}

export function toVirtualName(basePath, absolutePath) {
  const virtualFullPath = toVirtualFullPath(basePath, absolutePath)
  return path.basename(virtualFullPath);
}

export function toRealPath(basePath, virtualPath) {
  return path.join(basePath, virtualPath);
}

export const checkFilePathOrGen = (fullPath, suffix = '', genNameSuffix = i => `.${i}`) => {
  if (!fse.existsSync(fullPath)) {
      return fullPath
  }
  const basename = path.basename(fullPath, suffix);
  const dirname = path.dirname(fullPath);
  const temp = path.parse(basename)
  let index = 1;
  let result
  do {
      result = path.join(dirname, `${temp.name}${genNameSuffix(index++)}${temp.ext}${suffix}`);
  } while ((fse.existsSync(result)))

  return result
}

/**
 * 示例代码：
 */

// const basePath = "/a/b/c";
// const basePath2 = "/a/b/c/";

// const absolutePath = "/a/b/c/d/y.js";
// const virtualPath = "../c/d/y.js";

// console.log(absolutePath === toRealPath(basePath, virtualPath));
// console.log(absolutePath === toRealPath(basePath2, virtualPath));
// console.log(virtualPath === toVirtualFullPath(basePath, absolutePath));
// console.log(virtualPath === toVirtualFullPath(basePath2, absolutePath));

// const root = {
//   path: getVirtualRootPath(),
//   name: getVirtualRootName(basePath),
// };

// const Desktop = {
//   path: path.join(root.path, root.name),
//   name: "Desktop",
//   children: [],
// };

// Desktop.children.push({
//   path: path.join(Desktop.path, Desktop.name),
//   name: "文件夹",
//   children: [],
// });

// console.log(root, Desktop);



/**
 * path 代表文件或目录
 * file 代表文件 
 * dir 代表目录
 */
export function* walkPathSync(pathStr) {
  if (!fs.existsSync(pathStr)) {
    return;
  }

  const stat = fs.lstatSync(pathStr);
  yield [pathStr, stat];

  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(pathStr)) {
      yield* walkPathSync(path.join(pathStr, name));
    }
  }
}

/**** 分割线 ****/

class Sequence {
  _iterable: any
  constructor(_iterable) {
    this._iterable = _iterable;
    this[Symbol.iterator] = () => this._iterable[Symbol.iterator]();
    this[Symbol.asyncIterator] = () => this._iterable[Symbol.asyncIterator]();
  }

  reduce(callback, accumulator) {
    for (const item of this._iterable) {
      accumulator = callback(accumulator, item);
    }
    return accumulator;
  }

  async reduceAsync(callback, accumulator) {
    for await (const item of this._iterable) {
      accumulator = callback(accumulator, item);
    }
    return accumulator;
  }

  toArray() {
    return [...this._iterable]
  }

  async toArrayAsync() {
    let result = []
    for await (const item of this._iterable) {
      result.push(item)
    }
    return result
  }

  pipe(factoryFn) {
    const mediumIteratorObj = {
      [Symbol.iterator]: () => factoryFn.call(void 0, this._iterable),
      [Symbol.asyncIterator]: () => factoryFn.call(void 0, this._iterable)
    }
    return new Sequence(mediumIteratorObj);
  }
}

export const filter = (predicate) => function* innerFilter(iterable) {
  for (const item of iterable) {
    if (predicate(item)) {
      yield item;
    }
  }
};

export const filterAsync = (predicate) => async function* innerFilter(iterable) {
  for await (const item of iterable) {
    if (await predicate(item)) {
      yield item;
    }
  }
};

export function chain(iterable) {
  return new Sequence(iterable);
}

/**** 分割线 ****/

const singleCopy = () => {
  const stack = []

  return function* innerSingleCopy(iterable) {
    for (let [srcPath, targetPath, srcPathIsDir, targetPathIsDir] of iterable) {
      if (stack.length) {
        const replaceMap = stack[stack.length - 1]
        if (targetPath.startsWith(replaceMap[0])) {
          targetPath = targetPath.replace(replaceMap[0], replaceMap[1])
        } else {
          stack.pop()
        }
      }

      let fixedTargetPath = targetPath

      if (targetPathIsDir === srcPathIsDir) {
        fixedTargetPath = checkFilePathOrGen(targetPathIsDir)
      }

      if (typeof fixedTargetPath === 'string' && fixedTargetPath !== targetPath) {
        stack.push([path.join(targetPath, path.sep), path.join(fixedTargetPath, path.sep)])
      }
      yield [fixedTargetPath, targetPathIsDir]
    }
  }
}

const mapNewPath = (srcPath, distDir) => function* innerCopy(iterable) {
  const basename = path.basename(srcPath)
  const rootPath = path.join(distDir, basename)

  for (let [curPath, stat] of iterable) {
    const curPathIsDir = stat.isDirectory()
    const relativePath = path.relative(srcPath, curPath)
    let toPath = path.join(rootPath, relativePath)

    let toPathIsDir = void 0
    const isExists = fs.existsSync(toPath)
    if (isExists) {
      const toStat = fs.lstatSync(toPath)
      toPathIsDir = toStat.isDirectory()
    }

    yield [curPath, toPath, curPathIsDir, toPathIsDir]
  }
}

export const copyPath = (srcPath, distDir) => {
  return chain(walkPathSync(srcPath))
    .pipe(mapNewPath(srcPath, distDir))
    .pipe(singleCopy())
    .toArray()
}