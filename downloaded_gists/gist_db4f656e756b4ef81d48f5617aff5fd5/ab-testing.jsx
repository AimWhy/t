import * as React from "react";
import { useData } from "hooks";
import * as data from 'data';

function useData(key, default_value) {
  const [val, setVal] = React.useState(data.get(key, default_value));

  React.useEffect(() => {
    data.watch(key, setVal);
    return () => data.unwatch(key, setVal);
  }, []);

  React.useEffect(() => {
    data.set(key, val);
  }, [val]);

  return [val, setVal];
}

export function Variant({ children }) {
    return <React.Fragment>{children}</React.Fragment>;
}

export function Default({ children }) {
    return <React.Fragment>{children}</React.Fragment>;
}

export function Experiment({ name, children }) {
    if (children.filter((x) => x.type === Default).length !== 1) {
        throw new Error("Experiment must have exactly one Default child");
    }
    const [selected] = useData(`experiments.${name}`);
    const matching_child = children.find((x) => x.props?.value === selected) ||
        children.find((x) => x.type === Default);
    if (matching_child.type === Default && selected) {
        console.warn("Experiment", name, "has no matching child for value", selected);
    }
    React.useEffect(() => {
        const body_class = matching_child?.props?.bodyclass;
        if (body_class) {
            document.body.classList.add(body_class);
            return () => {
                document.body.classList.remove(body_class);
            };
        }
    }, [matching_child]);
    return matching_child;
}