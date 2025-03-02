import * as React from 'react';
import { createContext } from 'react';

export const Context = createContext({});

export function withContext(WrappedComponent) {
    const ComponentWithContext = (props) => {
        const { context, config, ...otherProps } = props;

        // Having no config means that this component is not a micro-frontend,
        // and there is no need to re-initialize the Context
        if (!config) {
            return <WrappedComponent {...otherProps} />;
        }

        ComponentWithContext.displayName = config.name;

        return (<Context.Provider value={context}>
            <WrappedComponent {...otherProps} />
        </Context.Provider>);
    };

    return ComponentWithContext;
}

/***************************** demo *****************************/

function MicroFrontendApp() {
    const { userProvider, customData } = React.useContext(Context);
    const [userName, setUserName] = React.useState('Guest');

    React.useEffect(() => {
        const userName = userProvider.getUserName();
        setUserName(userName);
    }, [userProvider]);

    return (<div style={{ backgroundColor: '#ff6384' }}>
        Hello, {userName} from {__APP_NAME__}
        {customData ? ` with ${customData}` : ''}!
    </div>);
}
const connected = withContext(MicroFrontendApp);
export { connected as MicroFrontendApp };