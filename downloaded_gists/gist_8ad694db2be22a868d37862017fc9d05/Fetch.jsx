import * as React from 'react';
import deepmerge from 'deepmerge';
import equal from 'react-fast-compare';

const referrerPolicyId = 'referrerPolicy';
const acceptId = 'Accept';
const contentTypeId = 'Content-Type';

export function callFetch({ url, method, headers = {}, body, includeContentType = true, contentType = 'application/json; charset=utf-8', includeAccept = true, accept = 'application/json,text/plain,*/*', includeReferrerPolicy = true, stringifyBody = true, }) {
  headers = { ...headers };
  if (includeAccept && !(acceptId in headers)) {
    headers[acceptId] = accept;
  }
  if (includeContentType && !(contentTypeId in headers)) {
    headers[contentTypeId] = contentType;
  }
  if (includeReferrerPolicy && !(referrerPolicyId in headers)) {
    headers[referrerPolicyId] = 'no-referrer';
  }
  const data = headers[contentTypeId] &&
    headers[contentTypeId].includes('application/json') &&
    stringifyBody ? JSON.stringify(body) : body;

  return fetch(url, {
    body: data,
    cache: 'no-cache',
    credentials: 'include',
    headers: {
      ...headers,
    },
    method,
    mode: 'cors',
    redirect: 'follow',
  });
}

export class Fetch extends React.Component {
  constructor(props) {
    super(props);
    this.read = this.read.bind(this);
    this.state = {
      data: this.props.initialValue || this.props.defaultValue,
      error: false,
      hasData: !!this.props.initialValue,
      loading: true,
    };
  }
  async componentDidMount() {
    this.read();
  }
  async componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.read();
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    return !equal(this.props, nextProps) || !equal(this.state, nextState);
  }
  render() {
    return this.props.children({ read: this.read, response: this.state });
  }
  async read() {
    try {
      this.setState({ error: false, errorMessage: undefined, loading: true });
      const response = await callFetch({
        body: this.props.body,
        contentType: this.props.contentType,
        headers: this.props.headers,
        method: this.props.method || 'GET',
        url: `${this.props.baseUrl}${this.props.url}`,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      let data;
      if (!this.props.contentType ||
        this.props.contentType.indexOf('application/json') === 0) {
        data = await response.json();
        if (this.props.defaultValue) {
          data = deepmerge(this.props.defaultValue, data);
        }
      } else {
        data = await response.text();
      }

      this.setState({ data, hasData: true, loading: false });
    } catch (e) {
      this.setState({
        data: this.props.defaultValue,
        error: true,
        errorMessage: e.message,
        hasData: false,
        loading: false,
      });
    }
  }
}

export class Stream extends Fetch {
  constructor() {
    super(...arguments);
    this.read = async () => {
      try {
        this.setState({ loading: true });

        callFetch({
          contentType: this.props.contentType,
          headers: this.props.headers,
          method: 'GET',
          url: `${this.props.baseUrl}${this.props.url}`,
        }).then(response => response.body).then(body => {
          this.reader = body.getReader();
          const textDecoder = new TextDecoder('utf-8');
          const pushData = (result) => {
            if (result.done) {
              this.setState({
                loading: false,
              });
            } else {
              this.setState({
                data: [...(this.state.data || []), textDecoder.decode(result.value)],
              });
              this.reader.read().then(pushData);
            }
          };
          this.reader.read().then(pushData);
        });
      } catch (e) {
        this.setState({
          error: true,
          errorMessage: e.message,
          loading: false,
        });
      }
    };
    this.onSave = async () => {
      throw new Error(`Can't save from a stream`);
    };
  }
  async componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.reader?.cancel();
      this.read();
    }
  }
  componentWillUnmount() {
    this.reader?.cancel();
  }
}

export const ApiContextDefaultValue = {
  apiUri: 'http://example.com',
  headers: {},
};
export const ApiContext = React.createContext(ApiContextDefaultValue);

export class SyndesisFetch extends React.Component {
  render() {
    const { url, stream, ...props } = this.props;
    const FetchOrStream = stream ? Stream : Fetch;

    return (<ApiContext.Consumer>
      {
        ({ apiUri, headers }) => (
          <FetchOrStream
            baseUrl={apiUri}
            url={url}
            headers={{
              ...(props.headers || headers),
            }}
            {...props}
          />)
      }
    </ApiContext.Consumer>);
  }
}