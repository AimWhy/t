export function mapSeries(values, fn) {
  return values.reduce((promiseChain, value) => {
    return promiseChain.then((chainResults) =>
      fn(value).then((currentResult) => [...chainResults, currentResult])
    );
  }, Promise.resolve([]));
}