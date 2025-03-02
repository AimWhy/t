// Inspired by https://github.com/camwest/react-slot-fill
import React from 'react';
import PropTypes from 'prop-types';

const StyleGuideContext = React.createContext({
  codeRevision: 0,
  cssRevision: '0',
  config: {},
  slots: {},
  displayMode: 'collapse',
});

export default StyleGuideContext;

export function useStyleGuideContext() {
  return React.useContext(StyleGuideContext);
}

export function Slot({ name, active, onlyActive, className, props = {} }) {
  const { slots } = useStyleGuideContext();
  const fills = slots[name];
  if (!fills) {
    throw new Error(
      `Slot "${name}" not found, available slots: ${Object.keys(slots).join(
        ', '
      )}`
    );
  }
  const rendered = fills.map((Fill, index) => {
    // { id: 'pizza', render: ({ foo }) => <div>{foo}</div> }
    const { id, render } = Fill;
    let fillProps = props;
    if (id && render) {
      // Render only specified fill
      if (onlyActive && id !== active) {
        return null;
      }
      // eslint-disable-next-line react/prop-types
      const { onClick } = props;
      fillProps = {
        ...props,
        name: id,
        // Set active prop to active fill
        active: active ? id === active : undefined,
        // Pass fill ID to onClick event handler
        onClick: onClick && ((...attrs) => onClick(id, ...attrs)),
      };
      const Render = render;
      return <Render key={index} {...fillProps} />;
    }
    const FillAsComponent = Fill;
    return <FillAsComponent key={index} {...fillProps} />;
  });
  const filtered = rendered.filter(Boolean);
  if (filtered.length === 0) {
    return null;
  }
  return <div className={className}>{filtered}</div>;
}
Slot.propTypes = {
  name: PropTypes.string.isRequired,
  active: PropTypes.string,
  onlyActive: PropTypes.bool,
  props: PropTypes.object,
  className: PropTypes.string,
};


/*******************************************/


import React from 'react';
import PropTypes from 'prop-types';
import { render, fireEvent } from '@testing-library/react';
import Slot from './Slot';
import Context from '../Context';
const Button = ({ active, children, ...props }) => {
    return (<button {...props} aria-current={active}>
            {children}
        </button>);
};
Button.propTypes = {
    active: PropTypes.bool,
    children: PropTypes.node,
};
const Button1 = (props) => <Button {...props}>Button1</Button>;
const Button2 = (props) => <Button {...props}>Button2</Button>;
const fillsWithIds = [
    {
        id: 'one',
        render: Button1,
    },
    {
        id: 'two',
        render: Button2,
    },
];
it('should render slots and pass props', () => {
    const { getByText, getAllByRole } = render(<Context.Provider value={{
            slots: {
                slot: [Button1, Button2],
            },
        }}>
            <Slot name="slot" props={{ role: 'pizza' }}/>
        </Context.Provider>);
    expect(getByText('Button1')).toBeInTheDocument();
    expect(getByText('Button2')).toBeInTheDocument();
    expect(getAllByRole('pizza')).toHaveLength(2);
});
it('should render slots in id/render format', () => {
    const { getByText } = render(<Context.Provider value={{
            slots: {
                slot: fillsWithIds,
            },
        }}>
            <Slot name="slot" props={{ id: 'Pizza' }}/>
        </Context.Provider>);
    expect(getByText('Button1')).toBeInTheDocument();
    expect(getByText('Button2')).toBeInTheDocument();
});
it('should pass active flag to active slot', () => {
    const { getByText } = render(<Context.Provider value={{
            slots: {
                slot: fillsWithIds,
            },
        }}>
            <Slot name="slot" active="two"/>
        </Context.Provider>);
    expect(getByText('Button1')).toHaveAttribute('aria-current', 'false');
    expect(getByText('Button2')).toHaveAttribute('aria-current', 'true');
});
it('should render only active slot if onlyActive=true', () => {
    const { queryByText } = render(<Context.Provider value={{
            slots: {
                slot: fillsWithIds,
            },
        }}>
            <Slot name="slot" active="two" onlyActive/>
        </Context.Provider>);
    expect(queryByText('Button1')).not.toBeInTheDocument();
    expect(queryByText('Button2')).toBeInTheDocument();
});
it('should pass slot ID to onClick handler', () => {
    const onClick = jest.fn();
    const { getByText } = render(<Context.Provider value={{
            slots: {
                slot: fillsWithIds,
            },
        }}>
            <Slot name="slot" props={{ onClick }}/>
        </Context.Provider>);
    fireEvent.click(getByText('Button2'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toBe('two');
});
it('should return null if all slots render null', () => {
    const { queryByText } = render(<Context.Provider value={{
            slots: {
                slot: [() => null],
            },
        }}>
            <Slot name="slot" props={{ id: 'Pizza' }}/>
        </Context.Provider>);
    expect(queryByText('Button1')).not.toBeInTheDocument();
    expect(queryByText('Button2')).not.toBeInTheDocument();
});
