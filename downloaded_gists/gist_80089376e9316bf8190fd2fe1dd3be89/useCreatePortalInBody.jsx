const useCreatePortalInBody = () => {
  const wrapperRef = useRef(null);
  if (wrapperRef.current === null && typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.setAttribute('data-body-portal', '');
    wrapperRef.current = div;
  }
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof document === 'undefined') {
      return;
    }
    document.querySelector('.test').appendChild(wrapper);
    return () => {
      document.querySelector('.test').appendChild(wrapper);
    }
  }, [])
  return (children => wrapperRef.current && createPortal(children, wrapperRef.current));
}

const createBodyPortal = useCreatePortalInBody();
<div>
  {createBodyPortal(
    <div>
      {holder}
    </div>
  )}
</div>
