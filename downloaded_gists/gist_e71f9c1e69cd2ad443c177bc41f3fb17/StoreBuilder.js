import createSagaMiddleware from 'redux-saga';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { persistReducer, persistStore } from 'redux-persist';
import persistStorage from 'redux-persist/es/storage';
import autoMergeLevel2 from 'redux-persist/es/stateReconciler/autoMergeLevel2';

export class StoreBuilder {
    constructor(reducerRegistry, initialState = { dynamic: {} }) {
        this.middlewares = [];
        this.persistConfig = {
            key: 'root',
            storage: persistStorage,
            stateReconciler: autoMergeLevel2,
            // https://github.com/rt2zz/redux-persist/issues/786
            timeout: null,
        };
        this.rootSagas = [];
        this.reducerRegistry = reducerRegistry;
        this.initialState = {
            dynamic: { ...initialState.dynamic },
            ...initialState,
        };
    }
    configureSaga(context) {
        this.context = context;
        this.sagaMiddleware = createSagaMiddleware({
            context: context,
        });
        this.middlewares.push(this.sagaMiddleware);
        return this;
    }
    configurePersistor(config) {
        this.persistConfig = {
            ...this.persistConfig,
            ...config,
        };
        return this;
    }
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    addRootSagas(sagas) {
        this.rootSagas = sagas;
        return this;
    }
    build() {
        if (!this.sagaMiddleware) {
            throw new Error('Saga middleware was not configured.');
        }

        if (!this.context) {
            throw new Error('Contexts must be configured using configureContext method');
        }

        const reducers = this.combine(this.reducerRegistry.getReducers(), this.reducerRegistry.getDynamicReducers(), [], this.initialState);
        const persistedReducer = persistReducer(this.persistConfig, reducers);
        const store = createStore(persistedReducer, this.initialState, applyMiddleware(...this.middlewares));

        const persistor = persistStore(store);
        this.reducerRegistry.addChangeListener('default', (newReducers, newDynamicReducers, persistBlacklistedDynamicReducers) => {
            store.replaceReducer(persistReducer(this.persistConfig, this.combine(newReducers, newDynamicReducers, persistBlacklistedDynamicReducers, store.getState())));
            persistor.persist();
        });

        this.rootSagas.map((saga) => this.sagaMiddleware.run(saga));

        return {
            store,
            reducerRegistry: this.reducerRegistry,
            runSaga: this.sagaMiddleware.run,
            context: this.context,
        };
    }
    combine(reducers, dynamicReducers, persistBlacklistedDynamicReducers, currentState = null) {
        const reducerNames = Object.keys(reducers);
        const dynamicReducerNames = Object.keys(dynamicReducers);

        Object.keys(currentState || this.initialState).forEach((item) => {
            if (reducerNames.indexOf(item) === -1) {
                reducers[item] = (state = null) => state;
            }
        });
        
        Object.keys((currentState && currentState.dynamic) || {}).forEach((item) => {
            if (dynamicReducerNames.indexOf(item) === -1) {
                dynamicReducers[item] = (state = null) => state;
            }
        });

        if (dynamicReducerNames.length > 0) {
            reducers.dynamic = persistReducer({
                ...this.persistConfig,
                key: `${this.persistConfig.key}.dynamic`,
                whitelist: void 0,
                blacklist: persistBlacklistedDynamicReducers,
            }, combineReducers(dynamicReducers));
        }
        return combineReducers(reducers);
    }
}

export class ReducerRegistry {
    constructor() {
        this.persistBlacklistedDynamicReducers = [];
        this.changeListeners = {};
        this.reducers = {};
        this.dynamicReducers = {};
    }
    getReducers() {
        return { ...this.reducers };
    }
    getDynamicReducers() {
        return { ...this.dynamicReducers };
    }
    register(name, reducer, skipIfExists = false) {
        if (skipIfExists && this.reducers.hasOwnProperty(name)) {
            return this;
        }

        this.reducers = { ...this.reducers, [name]: reducer };
        Object.keys(this.changeListeners).forEach((key) => {
            this.changeListeners[key](this.getReducers(), this.getDynamicReducers(), this.persistBlacklistedDynamicReducers);
        });
        return this;
    }
    registerDynamic(name, reducer, skipIfExists = false, shouldPersist = true) {
        if (skipIfExists && this.dynamicReducers.hasOwnProperty(name)) {
            return this;
        }

        this.dynamicReducers[name] = reducer;
        if (!shouldPersist) {
            this.persistBlacklistedDynamicReducers.push(name);
        }

        Object.keys(this.changeListeners).forEach((key) => {
            this.changeListeners[key](this.getReducers(), this.getDynamicReducers(), this.persistBlacklistedDynamicReducers);
        });
        return this;
    }
    exists(reducerName) {
        return this.reducers.hasOwnProperty(reducerName) || this.dynamicReducers.hasOwnProperty(reducerName);
    }
    addChangeListener(name, fn) {
        this.changeListeners[name] = fn;
        return this;
    }
    removeChangeListener(name) {
        delete this.changeListeners[name];
        return this;
    }
}
/*********************** demo ************************/

const reducerRegistry = new ReducerRegistry();

export const storeResult = new StoreBuilder(reducerRegistry, {})
    .configureSaga({ telemetryClient, authClient, httpClient, graphClient, appName })
    .configurePersistor({
        key: appName || Component.displayName || guid(),
    })
    .build();