const Wrapper = props => {
  const { isOldVersion = true, schema, ...rest } = props;
  let _schema = useRef(schema);
  if (isOldVersion) {
    _schema.current = updateSchemaToNewVersion(schema);
  }

  return <App schema={_schema.current} {...rest} />;
};

export default Wrapper;

const Watcher = ({ watchKey, watch, formData }) => {
  const value = getValueByPath(formData, watchKey);
  const watchObj = watch[watchKey];
  const firstMount = useRef(true);

  useEffect(() => {
    const runWatcher = () => {
      if (typeof watchObj === 'function') {
        watchObj(value);
      } else if (watchObj && typeof watchObj.handler === 'function') {
        watchObj.handler(value);
      }
    };

    if (firstMount.current) {
      const immediate = watchObj && watchObj.immediate;
      if (immediate) {
        runWatcher();
      }
      firstMount.current = false;
    } else {
      runWatcher();
    }
  }, [JSON.stringify(value)]);
  return null;
};



watchList.map((item, idx) => {
  return (
    <Watcher
      key={idx.toString()}
      watchKey={item}
      watch={watch}
      formData={formData}
    />
  );
})