import { useEffect, useState } from 'react';

export const useDynamicImport = (name) => {
  const [uri, setUri] = useState('');
  useEffect(() => {
    let abort = null;
    (async () => {
      const abortController = new Promise(resolve => {
        abort = resolve;
      });
      const svgData = import(`core/assets/svg/${name}.svg`);
      Promise.race([abortController, svgData]).then((data) => {
        if (data) {
          setUri(data?.default);
        }
      });
    })();
    return () => abort('');
  }, [name, setUri]);
  return [uri];
};
