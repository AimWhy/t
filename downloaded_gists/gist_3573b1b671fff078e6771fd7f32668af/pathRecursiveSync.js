const fs = require("fs");
const path = require("path");

function* walkPathSync(pathStr) {
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

function* pathRecursiveSync(srcPath, distDir, singleOp) {
  const basename = path.basename(srcPath)
  const rootPath = path.join(distDir, basename)
  const stack = []

  for (let [curPath, stat] of walkPathSync(srcPath)) {
    const curPathIsDir = stat.isDirectory()
    const relativePath = path.relative(srcPath, curPath)
    let toPath = path.join(rootPath, relativePath)

    if (stack.length) {
      const replaceMap = stack[stack.length - 1]
      if (toPath.startsWith(replaceMap[0])) {
        toPath = toPath.replace(replaceMap[0], replaceMap[1])
      } else {
        stack.pop()
      }
    }

    let toPathIsDir = void 0
    const isExists = fs.existsSync(toPath)
    if (isExists) {
      const toStat = fs.lstatSync(pathStr)
      toPathIsDir = toStat.isDirectory()
    }

    const fixedPath = singleOp(curPath, toPath, curPathIsDir, toPathIsDir)
    if (typeof fixedPath === 'string' && fixedPath !== toPath) {
      stack.push([path.join(toPath, path.sep), path.join(fixedPath, path.sep)])
    }

    yield [fixedPath, curPathIsDir]
  }
}

function test() {
  const source = '/Users/hongying/rvspace/aospacerootpath'
  const target = '/Users/hongying/rvspace/test'

  const op = (srcPath, targetPath, srcPathIsDir, targetPathIsDir) => {
    if (targetPath === '/Users/hongying/rvspace/test/aospacerootpath/B') {
      targetPath = '/Users/hongying/rvspace/test/aospacerootpath/B99'
    }
    if (targetPath === '/Users/hongying/rvspace/test/aospacerootpath/c(2)(2)') {
      targetPath = '/Users/hongying/rvspace/test/aospacerootpath/c22222222'
    }
    // console.log(targetPath)
    return targetPath
  }

  for (let [pathStr, isDir] of pathRecursiveSync(source, target, op)) {
    console.log(`${pathStr} => ${isDir}`)
  }
}

test()
