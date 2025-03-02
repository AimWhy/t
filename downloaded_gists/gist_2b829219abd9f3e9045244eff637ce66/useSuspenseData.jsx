import * as React from 'react';

const LOADER = '__SUSPENSE_LOADER__';
const SuspenseContext = React.createContext(void 0);

export function useSuspenseData(request) {
  const suspenseState = React.useContext(SuspenseContext);
  const { data, done, promise, update, error, id } = suspenseState;

  // use data from server side directly when hydrate.
  if (window[LOADER] && window[LOADER].has(id)) {
    return window[LOADER].get(id);
  }

  if (done) {
    return data;
  }

  if (error) {
    throw error;
  }

  // request is pending.
  if (promise) {
    throw promise;
  }

  // when called by Data, request is null.
  if (!request) {
    return null;
  }

  // send request and throw promise
  const thenable = request();
  thenable
    .then((response) => {
      update({ done: true, data: response, promise: null });
    })
    .catch((e) => {
      update({ done: true, error: e, promise: null });
    });

  update({ promise: thenable });

  throw thenable;
}

export function withSuspense(Component) {
  return (props) => {
    const { fallback, id, ...componentProps } = props;
    const suspenseState = {
      id: id,
      data: null,
      done: false,
      promise: null,
      error: null,
      update: (value) => {
        Object.assign(suspenseState, value);
      },
    };

    return (
      <React.Suspense fallback={fallback || null}>
        <SuspenseContext.Provider value={suspenseState}>
          <Component {...componentProps} />
          <Data id={id} />
        </SuspenseContext.Provider>
      </React.Suspense>
    );
  };
}

function Data(props) {
  const data = useSuspenseData();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
        if (!window.${LOADER}) { 
            window.${LOADER} = new Map();
        } 
        window.${LOADER}.set('${props.id}', ${JSON.stringify(data)});
        `,
      }}
    />
  );
}
