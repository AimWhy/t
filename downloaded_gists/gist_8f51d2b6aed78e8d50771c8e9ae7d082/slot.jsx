import React, {useMemo, useState, useCallback} from 'react';

const useSlot = children =>

    /**
     * map slots
     */
    useMemo(() => {
        const slotsMap = React.Children.toArray(children)
            .reduce((result, child) => {
                if (child.props && child.props.slot) {
                    result[child.props.slot] = child;
                }
                else {
                    result.default.push(child);
                }

                return result;
            }, {default: []});

        /**
         * slot compomponent
         */
        const Slot = ({name, children: defaultChildren = null, scope}) => {
            if (!name) {
                return slotsMap.default.length ? slotsMap.default : defaultChildren;
            }
            return slotsMap[name]
                ? (typeof slotsMap[name].props.children === 'function'
                    ? slotsMap[name].props.children(scope)
                    : slotsMap[name])
                : defaultChildren;
        };

        console.log('children changed');

        return Slot;
    }, [children]);

const Panel = ({children}) => {
    const [count, setCount] = useState(0);

    const Slot = useSlot(children);

    const onClick = useCallback(() => {
        setCount(v => v + 1);
    }, [setCount]);

    return (
        <div className="panel">
            <Slot name="header" scope={count}>
                <header>
                    默认header
                </header>
            </Slot>
            <p>--------header/body----------</p>
            <Slot />
            <p>--------body/footer----------</p>
            <Slot name="footer">
                <footer>
                    DEFAULT_FOOTER
                </footer>
            </Slot>
            <p>################################</p>
            {count}
            <button type="button" onClick={onClick}>内层增加+</button>
        </div>
    );
};


export default function StudyDataStatisticsWrap() {
    const [count2, setCount] = useState(0);
    const onClick = useCallback(() => {
        setCount(v => v + 1);
    }, [setCount]);

    return (
        <>
            <Panel>
                <div slot="header">
                    {count => `自定义header: ${count} === ${count2}`}
                </div>

                自定义body内容
            </Panel>

            {count2}
            <button type="button" onClick={onClick}>外层增加+</button>
        </>
    );
}
