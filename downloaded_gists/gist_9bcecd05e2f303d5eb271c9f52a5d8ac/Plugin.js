import React, { useContext, useState } from "react";
export class Pluggable {
    constructor() {
        this.stateful = false;
    }
    init() { }
}
export class Plugin {
    constructor(ctor) {
        this.Provide = ({ children }) => {
            let t = new this.ctor();
            if (t.stateful) {
                t = useState(t)[0];
            }
            if (t.init) {
                t.init();
            }
            return <this.context.Provider value={t}>{children}</this.context.Provider>;
        };
        this.ctor = ctor;
        this.context = React.createContext(new ctor());
    }
}
export function usePlugin(plugin) {
    return useContext(plugin.context);
}