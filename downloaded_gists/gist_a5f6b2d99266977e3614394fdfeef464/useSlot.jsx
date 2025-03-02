const useSlot = (children) => {
  /**
   * map slots
   */
  const slots = React.Children.toArray(children)
    .reduce((result, child) => {
      if (child.props && child.props.slot) {
        result[child.props.slot] = child;
      } else {
        result.default.push(child);
      }
      
      return result;
    }, { default: [] });

  /**
   * slot compomponent
   */
  const Slot = ({ name, children: slotChildren }) => {
    if (!name) {
      return slots.default.length ? slots.default : (slotChildren || null);
    }
    return slots[name] || slotChildren || null;
  };

  return Slot;
};

const Panel = ({ children }: { children: any }) => {
  const Slot = useSlot(children);

  return (
    <div className="panel">
      <Slot name="header">
        <header>
          DEFAULT_HEADER
        </header>
      </Slot>
      <p>CONTENT_START</p>
      <Slot />
      <p>CONTENT_END</p>
      <Slot name="footer">
        <footer>
          DEFAULT_FOOTER
        </footer>
      </Slot>
    </div>
  );
};

const renderPanal = () => (
  <Panel>
    <div slot="header">
      PASSED_HEADER
    </div>
    PASSED_CHILDREN
  </Panel>
);

/* renderPanal() result:

<div class="panel">
  <div slot="header">PASSED_HEADER</div>
  <p>CONTENT_START</p>
  PASSED_CHILDREN
  <p>CONTENT_END</p>
  <footer>DEFAULT_FOOTER</footer>
</div>

*/
