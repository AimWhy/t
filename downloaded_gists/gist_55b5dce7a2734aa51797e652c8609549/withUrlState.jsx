import React, { useReducer, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'dva/router';
import { parse, stringify } from 'query-string';
import { useMemoizedFn } from '../hooks/useMemoFun';

const baseParseConfig = {
  parseNumbers: false,
  parseBooleans: false
};
const baseStringifyConfig = {
  skipNull: false,
  skipEmptyString: false
};

export const withUrlState = (Component, initialState, options) =>
  withRouter(props => {
    const { location, history } = props;
    const {
      navigateMode = 'push',
      parseOptions,
      stringifyOptions
    } = options || {};
    const mergedParseOptions = { ...baseParseConfig, ...parseOptions };
    const mergedStringifyOptions = {
      ...baseStringifyConfig,
      ...stringifyOptions
    };
    const initialStateRef = useRef(
      typeof initialState === 'function' ? initialState() : initialState || {}
    );

    const forceUpdate = useReducer(x => x + 1, 0)[1];

    const queryFromUrl = useMemo(
      () => parse(location.search, mergedParseOptions),
      [location.search]
    );

    const queryData = useMemo(
      () => ({
        ...initialStateRef.current,
        ...queryFromUrl
      }),
      [queryFromUrl]
    );

    const setState = s => {
      const newQuery = typeof s === 'function' ? s(queryData) : s;
      // 1. 如果 setState 后，search 没变化，就需要 update 来触发一次更新。比如 demo1 直接点击 clear，就需要 update 来触发更新。
      // 2. update 和 history 的更新会合并，不会造成多次更新
      forceUpdate();
      history[navigateMode]({
        hash: location.hash,
        search:
          stringify({ ...queryFromUrl, ...newQuery }, mergedStringifyOptions) ||
          '?'
      });
    };

    const setQueryData = useMemoizedFn(setState);

    return (
      <Component queryData={queryData} setQueryData={setQueryData} {...props} />
    );
  });

export const withHook = useHook => BaseComponent =>
  React.memo(ownProps => <BaseComponent {...ownProps} {...useHook()} />);

const emptyRect = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0
};
// !import: BaseComponent 为类组件
export default function withBoundingRects(BaseComponent) {
  class WrappedComponent extends React.PureComponent {
    constructor(props) {
      super(props);
      this.state = {
        rect: undefined,
        parentRect: undefined
      };
      this.getRects = this.getRects.bind(this);
    }

    componentDidMount() {
      // eslint-disable-next-line react/no-find-dom-node
      this.node = ReactDOM.findDOMNode(this);
      this.setState(() => this.getRects());
    }

    getRects() {
      if (!this.node) {
        return this.state;
      }

      const { node } = this;
      const parentNode = node.parentNode;
      const rect = node.getBoundingClientRect
        ? node.getBoundingClientRect()
        : emptyRect;
      const parentRect = parentNode?.getBoundingClientRect
        ? parentNode.getBoundingClientRect()
        : emptyRect;
      return { rect, parentRect };
    }

    render() {
      return (
        <BaseComponent
          getRects={this.getRects}
          {...this.state}
          {...this.props}
        />
      );
    }
  }
  WrappedComponent.displayName = `withBoundingRects(${
    BaseComponent.displayName || ''
  })`;

  return WrappedComponent;
}
