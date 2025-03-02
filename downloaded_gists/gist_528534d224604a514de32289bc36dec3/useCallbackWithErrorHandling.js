function useDebounce(callback, delay) {
  const callbackRef = React.useRef(callback)
  React.useLayoutEffect(() => {
    callbackRef.current = callback
  })
  return React.useMemo(
    () => debounce((...args) => callbackRef.current(...args), delay),
    [delay],
  )
}


const useThrowAsyncError = () => {
  const [state, setState] = useState();

  return (error) => {
    setState(() => throw error)
  }
}


const useCallbackWithErrorHandling = (callback) => {
  const [state, setState] = useState();

  return (...args) => {
    try {
      callback(...args);
    } catch(e) {
      setState(() => throw e);
    }
  }
}