import { useEffect, useState, useRef } from 'react';

export default function useCreatePage(handleCreatePage) {
  const cancelableCreateSuggestion = useRef();
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const createPage = async function (suggestionTitle) {
    setIsCreatingPage(true);
    setErrorMessage(null);

    try {
      cancelableCreateSuggestion.current = makeCancelable(
        Promise.resolve(handleCreatePage(suggestionTitle))
      );

      return await cancelableCreateSuggestion.current.promise;
    } catch (error) {
      if (error && error.isCanceled) {
        return;
      }

      setErrorMessage(error.message || 'An unknown error occurred during creation.');
      throw error;
    } finally {
      setIsCreatingPage(false);
    }
  };

  useEffect(() => {
    return () => {
      if (cancelableCreateSuggestion.current) {
        cancelableCreateSuggestion.current.cancel();
      }
    };
  }, []);

  return {
    createPage,
    isCreatingPage,
    errorMessage,
  };
}

const makeCancelable = (promise) => {
  let hasCanceled_ = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      (val) => hasCanceled_ ? reject({ isCanceled: true }) : resolve(val),
      (error) => hasCanceled_ ? reject({ isCanceled: true }) : reject(error)
    );
  });

  return {
    promise: wrappedPromise,
    cancel() { hasCanceled_ = true },
  };
};