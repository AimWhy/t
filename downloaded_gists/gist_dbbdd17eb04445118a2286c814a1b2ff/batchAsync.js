function batchAsync(fn, items, concurrency) {
  let batches = Promise.resolve([])
  items = [...items]

  while (items.length) {
    const slice = items.splice(0, concurrency)
    
    batches = batches.then((previousBatch) => {
      return Promise.all(slice.map((...args) => fn(...args))).then((currentBatch) => [
        ...previousBatch,
        ...currentBatch
      ])
    })
  }

  return batches
}