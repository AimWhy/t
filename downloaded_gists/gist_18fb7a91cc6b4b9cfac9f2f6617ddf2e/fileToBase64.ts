  const fileToBase64 = (file: File): Promise<string> => {
    const { promise, resolve, reject } = Promise.withResolvers<string>();

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file);
    return promise;
  };

function waitForStreamToClose(stream: Stream) {
  const deferred = Promise.withResolvers<void>();
  const cleanup = () => {
    stream.removeListener("close", onClose);
    stream.removeListener("error", onError);
  };
  const onClose = () => {
    cleanup();
    deferred.resolve();
  };
  const onError = (err: Error) => {
    cleanup();
    deferred.reject(err);
  };
  stream.once("close", onClose);
  stream.once("error", onError);
  return deferred.promise;
}