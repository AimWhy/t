import React from 'react';
import ReactDOM from 'react-dom';
const emptyRect = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
};
export default function withBoundingRects(BaseComponent) {
    return class WrappedComponent extends React.PureComponent {
        constructor(props) {
            super(props);
            this.state = {
                rect: undefined,
                parentRect: undefined,
            };
            this.getRects = this.getRects.bind(this);
        }
        static { this.displayName = `withBoundingRects(${BaseComponent.displayName || ''})`; }
        componentDidMount() {
            this.node = ReactDOM.findDOMNode(this);
            this.setState(() => this.getRects());
        }
        getRects() {
            if (!this.node)
                return this.state;
            const { node } = this;
            const parentNode = node.parentNode;
            const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : emptyRect;
            const parentRect = parentNode?.getBoundingClientRect
                ? parentNode.getBoundingClientRect()
                : emptyRect;
            return { rect, parentRect };
        }
        render() {
            return <BaseComponent getRects={this.getRects} {...this.state} {...this.props}/>;
        }
    };
}