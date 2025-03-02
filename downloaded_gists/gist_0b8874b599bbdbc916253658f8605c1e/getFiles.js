

// Copy from https://github.com/primetwig/react-nestable/blob/dacea9dc191399a3520f5dc7623f5edebc83e7b7/dist/utils.js
export const closest = (target, selector) => {
  // closest(e.target, '.field')
  while (target) {
    if (target.matches && target.matches(selector)) return target
    target = target.parentNode
  }
  return null
}

export const getOffsetRect = (elem) => {
  // (1)
  const box = elem.getBoundingClientRect(),
    body = document.body,
    docElem = document.documentElement,
    // (2)
    scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop,
    scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft,

    // (3)
    clientTop = docElem.clientTop || body.clientTop || 0,
    clientLeft = docElem.clientLeft || body.clientLeft || 0,

    // (4)
    top = box.top + scrollTop - clientTop,
    left = box.left + scrollLeft - clientLeft;

  return {
    top: Math.round(top),
    left: Math.round(left)
  }
}


// copied from https://stackoverflow.com/a/32180863
export const timeConversion = (millisecond) => {
  let seconds = (millisecond / 1000).toFixed(0),
    minutes = (millisecond / (1000 * 60)).toFixed(0),
    hours = (millisecond / (1000 * 60 * 60)).toFixed(1),
    days = (millisecond / (1000 * 60 * 60 * 24)).toFixed(1);

  if (seconds < 60) {
    return seconds + 's'
  } else if (minutes < 60) {
    return minutes + 'm'
  } else if (hours < 24) {
    return hours + 'h'
  } else {
    return days + 'd'
  }
}

export const getSelectionText = () => {
  const selection = (window.getSelection() || '').toString().trim()
  if (selection) {
    return selection
  }

  // Firefox fix
  const activeElement = window.document.activeElement
  if (activeElement) {
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const el = activeElement
      return el.value.slice(el.selectionStart || 0, el.selectionEnd || 0)
    }
  }

  return ''
}

// Modified from https://github.com/GoogleChromeLabs/browser-nativefs
// because shadow-cljs doesn't handle this babel transform
export const getFiles = async (dirHandle, recursive, cb, path = dirHandle.name) => {
  const dirs = []
  const files = []
  for await (const entry of dirHandle.values()) {
    const nestedPath = `${path}/${entry.name}`
    if (entry.kind === 'file') {
      if (cb) {
        cb(nestedPath, entry)
      }
      files.push(
        entry.getFile().then((file) => {
          Object.defineProperty(file, 'webkitRelativePath', {
            configurable: true,
            enumerable: true,
            get: () => nestedPath,
          })
          Object.defineProperty(file, 'handle', {
            configurable: true,
            enumerable: true,
            get: () => entry,
          })
          return file
        })
      )
    } else if (entry.kind === 'directory' && recursive) {
      if (cb) { cb(nestedPath, entry) }
      dirs.push(...(await getFiles(entry, recursive, cb, nestedPath)))
    }
  }
  return [...(await Promise.all(dirs)), ...(await Promise.all(files))]
}

export const verifyPermission = async (handle, readWrite) => {
  const options = {}
  if (readWrite) {
    options.mode = 'readwrite'
  }
  // Check if permission was already granted.
  if ((await handle.queryPermission(options)) === 'granted') {
    return
  }
  // Request permission. If the user grants permission, just return.
  if ((await handle.requestPermission(options)) === 'granted') {
    return
  }
  // The user didn't grant permission, throw an error.
  throw new Error('Permission is not granted')
}

// NOTE: Need externs to prevent `options.recursive` been munged
//       When building with release.
//       browser-fs-access doesn't return directory handles
//       Ref: https://github.com/GoogleChromeLabs/browser-fs-access/blob/3876499caefe8512bfcf7ce9e16c20fd10199c8b/src/fs-access/directory-open.mjs#L55-L69
export const openDirectory = async (options = {}, cb) => {
  options.recursive = options.recursive || false;
  const handle = await window.showDirectoryPicker({
    mode: 'readwrite'
  });
  const _ask = await verifyPermission(handle, true);
  return [handle, ...(await getFiles(handle, options.recursive, cb))];
};

export const writeFile = async (fileHandle, contents) => {
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable()

  if (contents instanceof ReadableStream) {
    await contents.pipeTo(writable)
  } else {
    // Write the contents of the file to the stream.
    await writable.write(contents)
    // Close the file and write the contents to disk.
    await writable.close()
  }
}

export const nfsSupported = () => {
  if ('chooseFileSystemEntries' in self) {
    return 'chooseFileSystemEntries'
  } else if ('showOpenFilePicker' in self) {
    return 'showOpenFilePicker'
  }
  return false
}


export const getClipText = (cb, errorHandler) => {
  navigator.permissions.query({
    name: "clipboard-read"
  }).then((result) => {
    if (result.state == "granted" || result.state == "prompt") {
      navigator.clipboard.readText().then(text => {
        cb(text);
      }).catch(err => {
        errorHandler(err)
      });
    }
  })
}

export const writeClipboard = ({ text, html, blocks }) => {
  const navigator = window.navigator

  navigator.permissions.query({
    name: "clipboard-write"
  }).then((result) => {
    if (result.state != "granted" && result.state != "prompt") {
      console.debug("Copy without `clipboard-write` permission:", text)
      return
    }
    let promise_written = null
    if (typeof ClipboardItem !== 'undefined') {
      let blob = new Blob([text], {
        type: ["text/plain"]
      });

      let data = [new ClipboardItem({
        ["text/plain"]: blob
      })];

      if (html) {
        let richBlob = new Blob([html], {
          type: ["text/html"]
        })
        data = [new ClipboardItem({
          ["text/plain"]: blob,
          ["text/html"]: richBlob
        })];
      }

      if (blocks) {
        let blocksBlob = new Blob([blocks], {
          type: ["web application/logseq"]
        })

        let richBlob = new Blob([html], {
          type: ["text/html"]
        })

        data = [new ClipboardItem({
          ["text/plain"]: blob,
          ["text/html"]: richBlob,
          ["web application/logseq"]: blocksBlob
        })];
      }
      promise_written = navigator.clipboard.write(data)
    } else {
      console.debug("Degraded copy without `ClipboardItem` support:", text)
      promise_written = navigator.clipboard.writeText(text)
    }

    promise_written.then(() => {
    }).catch(e => {
      console.log(e, "fail")
    })
  })
}

export const saveToFile = (data, fileName, format) => {
  if (!data) return
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.${format}`
  link.click()
}

export const canvasToImage = (canvas, title = 'Untitled', format = 'png') => {
  canvas.toBlob(
    (blob) => {
      console.log(blob)
      saveToFile(blob, title, format)
    },
    `image/.${format}`
  )
}

export const elementIsVisibleInViewport = (el, partiallyVisible = false) => {
  const { top, left, bottom, right } = el.getBoundingClientRect()
  const { innerHeight, innerWidth } = window
  return partiallyVisible
    ? ((top > 0 && top < innerHeight) ||
      (bottom > 0 && bottom < innerHeight)) &&
    ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
    : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth
}
