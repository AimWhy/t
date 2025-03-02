import { useMemo, Component } from "react"
import { Subject } from "rxjs/Subject"
import { filter } from "rxjs/operators/filter"

const implementSymbol = Symbol.for("__REVA_IMPLEMENT__")
const namesSymbol = Symbol.for("__REVA_NAMES__")
const actionsSymbol = Symbol.for("__REVA_ACTIONS")

const isFn = val => typeof val === "function"

const createEva = (actions, effects, subscribes = {}) => {
    const subscription = () => {
        if (isFn(effects)) {
            effects((type, $filter, initValue) => {
                if (!subscribes[type]) {
                    const input$ = new Subject();
                    const output$ = new BehaviorSubject(initValue);
                    subscribes[type] = [input$, output$]
                }

                if (isFn($filter)) {
                    subscribes[type][0].pipe(filter($filter)).subscribe(output => output$.next(output));
                }

                return subscribes[type][1]
            }, actions)
        }
    }

    const dispatch = (type, ...args) => {
        if (subscribes[type]) {
            subscribes[type][0].next(...args)
        }
    }

    dispatch.lazy = (type, fn) => {
        if (subscribes[type] && isFn(fn)) {
            subscribes[type][0].next(fn())
        }
    }

    const implementAction = (name, fn) => (actions && actions[implementSymbol]) ? actions[implementSymbol](name, fn) : fn

    const implementActions = obj => {
        let actionsMap = {}

        for (let name in obj) {
            if (obj.hasOwnProperty(name) && isFn(obj[name])) {
                actionsMap[name] = implementAction(name, obj[name])
            }
        }

        return actionsMap
    }

    return {
        dispatch,
        subscription,
        implementActions
    }
}

class ActionFactory {
    constructor(names, isAsync = true) {
        const resolvers = {}
        const actions = {}

        names.forEach(name => {
            this[name] = (...args) => {
                if (isAsync) {
                    return new Promise((resolve, reject) => {
                        if (actions[name]) {
                            resolve(actions[name](...args))
                        } else {
                            resolvers[name] = resolvers[name] || []
                            resolvers[name].push({ args, resolve, reject })
                        }
                    })
                }

                if (actions[name]) {
                    return actions[name](...args)
                } else {
                    resolvers[name] = resolvers[name] || []
                    resolvers[name].push({ args, resolve: null, reject: null })

                    if (console && console.error) {
                        console.error(`方法 "${name}" 未实现，建议使用 "createAsyncFormActions" 方法创建`)
                    }
                }
            }
        })

        this[actionsSymbol] = true
        this[namesSymbol] = names
        this[implementSymbol] = (name, fn) => {
            actions[name] = fn

            if (resolvers[name] && resolvers[name].length) {
                setTimeout(() => {
                    for (let i = 0; i < resolvers[name].length; i++) {
                        const { resolve, args } = resolvers[name][i]
                        if (resolve) {
                            resolve(fn(...args))
                        } else {
                            fn(...args)
                        }
                    }
                    resolvers[name].length = 0
                })
            }

            return fn
        }
    }
}

export const connect = options => {
    let Target
    let defaultOptions = { autoRun: true}

    if (isFn(options)) {
        Target = options
        options = { ...defaultOptions }
    } else {
        options = { ...defaultOptions, ...options }
    }

    const _class_ = Target => {
        class Effect extends Component {
            constructor(props) {
                super(props)

                this.subscribes = {}
                const { subscription, dispatch, implementActions } = createEva(props.actions, props.effects, this.subscribes)
                this.implementActions = implementActions
                this.subscription = subscription
                this.dispatch = dispatch

                if (options.autoRun) {
                    subscription()
                }
            }

            render() {
                return (
                    <Target
                        {...this.props}
                        implementActions={this.implementActions}
                        dispatch={this.dispatch}
                        subscribes={this.subscribes}
                        subscription={this.subscription}
                    />
                )
            }
        }

        return Effect
    }

    return Target ? _class_(Target) : _class_
}

export const mergeActions = (...all) => {
    const result = {
        [actionsSymbol]: true,
        [namesSymbol]: [],
        [implementSymbol]: (name, fn) => {
            all.forEach(actions => {
                if (actions[implementSymbol] && actions[namesSymbol].includes(name)) {
                    actions[implementSymbol](name, fn)
                }
            })
            return fn
        }
    }

    for (let i = 0; i < all.length; i++) {
        let actions = all[i]
        result[namesSymbol] = result[namesSymbol].concat(actions[namesSymbol])

        for (let key in actions) {
            if (actions.hasOwnProperty(key) && key !== implementSymbol && key !== namesSymbol) {
                result[key] = actions[key]
            }
        }
    }

    return result
}

export const createEffects = (names, fn, isAsync) => ({actions: new ActionFactory(names, isAsync), effects: fn})

export const useEva = ({ actions, effects, subscribes, autoRun = true }) => {
    return useMemo(() => {
        const manager = createEva(actions, effects, subscribes)
        autoRun && manager.subscription()
        return manager
    }, [])
}
