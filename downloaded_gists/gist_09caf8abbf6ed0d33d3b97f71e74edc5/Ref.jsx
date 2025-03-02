import * as React from 'react';
import * as ReactDOM from 'react-dom';

const REACT_ELEMENT_TYPE = Symbol.for('react.element');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');

function isForward(object) {
  if (typeof object === 'object' && object !== null) {
    const $$typeof = object.$$typeof;
    const type = object.type;
    const $$typeofType = type && type.$$typeof;

    if ($$typeof === REACT_ELEMENT_TYPE && $$typeofType === REACT_FORWARD_REF_TYPE) {
      return true;
    }
  }

  return false;
}

function handleRef(ref, node) {
  if (typeof ref === 'function') {
    ref(node);
  } else if (ref !== null && typeof ref === 'object') {
    ref.current = node;
  }
};

export class Ref extends React.Component {
  constructor() {
    super();

    this.prevNode = null;
    this.currentNode = null;
    this.state = { kind: null };

    this.handleForwardRefOverride = (node) => {
      const { children, innerRef } = this.props;
      handleRef(children.ref, node);
      handleRef(innerRef, node);
      this.currentNode = node;
    };

    this.handleSelfOverride = (node) => {
      const { children, innerRef } = this.props;
      handleRef(children.props.innerRef, node);
      handleRef(innerRef, node);
    };
  }

  static getDerivedStateFromProps(props) {
    const child = React.Children.only(props.children);

    if (child.type === Ref) {
      return { kind: 'self' };
    }

    if (isForward(child)) {
      return { kind: 'forward' };
    }

    return { kind: 'find' };
  }

  componentDidMount() {
    if (this.state.kind === 'find') {
      const currentNode = ReactDOM.findDOMNode(this);

      this.prevNode = currentNode;
      handleRef(this.props.innerRef, currentNode);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.kind === 'forward') {
      if (prevProps.innerRef !== this.props.innerRef) {
        handleRef(this.props.innerRef, this.currentNode);
      }
    } else if (this.state.kind === 'find') {
      const currentNode = ReactDOM.findDOMNode(this);
      const isNodeChanged = this.prevNode !== currentNode;
      const isRefChanged = prevProps.innerRef !== this.props.innerRef;

      if (isNodeChanged) {
        this.prevNode = currentNode;
      }

      if (isNodeChanged || isRefChanged) {
        handleRef(this.props.innerRef, currentNode);
      }
    }
  }

  componentWillUnmount() {
    if (this.state.kind === 'forward') {
      delete this.currentNode;
    } else if (this.state.kind === 'find') {
      handleRef(this.props.innerRef, null);
      delete this.prevNode;
    }
  }

  render() {
    const { children, innerRef, ...rest } = this.props;
    const childWithProps = rest && Object.keys(rest).length > 0 ? React.cloneElement(children, rest) : children;

    if (this.state.kind === 'find') {
      return childWithProps;
    }

    if (this.state.kind === 'forward') {
      return React.cloneElement(childWithProps, { ref: this.handleForwardRefOverride });
    }

    if (this.state.kind === 'self') {
      return React.cloneElement(childWithProps, { innerRef: this.handleSelfOverride });
    }

    return null;
  }
}
