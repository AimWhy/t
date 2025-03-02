const noop = _ => _;

class Subscription {
    constructor(_unsubscribe = noop) {
        this.closed = false;
        this._unsubscribe = _unsubscribe;
    }
    setInnerUnsubscribe(value) {
        this._unsubscribe = value;
    }
    unsubscribe() {
        this._unsubscribe();
        this.closed = true;
    }
}

class Subscriber extends Subscription {
    constructor(observer) {
        super();
        this.observer = observer;
    }
    next(x) {
        this.observer.next(x);
    }
    error(e) {
        this.observer.error(e);
        this.unsubscribe();
    }
    complete() {
        this.observer.complete();
        this.unsubscribe();
    }
}

class Observable {
    constructor(subscribeRunner = null) {
        if (subscribeRunner) {
            this.subscribeRunner = subscribeRunner;
        }
    }
    subscribe(observerOrNext, error = noop, complete = noop) {
        const obj = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;
        const observer = { error, complete, ...obj };
        const subscriber = new Subscriber(observer);
        const subscription = this.subscribeRunner(subscriber);
        if (typeof subscription === 'function') {
            subscriber.setInnerUnsubscribe(subscription);
        }
        return subscriber.unsubscribe;
    }
    pipe(...operations) {
        if (operations.length === 0) {
            return this;
        }
        return operations.reduce((prev, fn) => fn(prev), this);
    }
}

class Subject extends Observable {
    constructor() {
        super();
        this.subscribers = [];
        this.isStopped = false;
    }
    subscribe(observerOrNext, error = noop, complete = noop) {
        const obj = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;
        const observer = { error, complete, ...obj };
        const subscriber = new Subscriber(observer);
        this.subscribers.push(subscriber);
        subscriber.setInnerUnsubscribe(() => {
            const index = this.subscribers.indexOf(subscriber);
            if (index >= 0) {
                this.subscribers.splice(index, 1);
            }
        });
        return subscriber.unsubscribe;
    }
    next(x) {
        this.subscribers.forEach((subscriber) => subscriber.next(x));
    }
    error(e) {
        this.subscribers.forEach((subscriber) => subscriber.error(e));
        this.isStopped = true
    }
    complete() {
        this.subscribers.forEach((subscriber) => subscriber.complete());
        this.isStopped = true
    }
}

const map = (fn) => (observable) => (
    new Observable(subscriber => {
        observable.subscribe({
            next: (val) => {
                try {
                    const newVal = fn(val)
                    subscriber.next(newVal)
                } catch (err) {
                    subscriber.error(err)
                }
            },
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
        })
    })
);

const catchError = (fn) => (observable) => (
    new Observable(subscriber => {
        (function changeSource(source) {
            source.subscribe({
                next: val => subscriber.next(val),
                error: err => {
                    if (fn !== null) {
                        changeSource(fn(err));
                        fn = null;
                    } else {
                        subscriber.error(err);
                    }
                },
                complete: () => subscriber.complete(),
            });
        })(observable);
    })
);

const concatMap = (fn) => (observable) => (
    new Observable(subscriber => {
        let isRunning = false;
        const endValue = {};
        const pendingQueue = []
        const checkRunning = () => {
            if (!isRunning && pendingQueue.length) {
                switchSource();
            }
        };
        const switchSource = () => {
            const val = pendingQueue.shift();
            if (val === endValue) {
                return subscriber.complete()
            }
            isRunning = true;
            try {
                fn(val).subscribe({
                    next: val => subscriber.next(val),
                    error: (err) => subscriber.error(err),
                    complete: () => (isRunning = false, checkRunning()),
                })
            } catch (err) {
                subscriber.error(err);
            }
        };
        observable.subscribe({
            next: val => pendingQueue.push(val) && checkRunning(),
            error: (err) => subscriber.error(err),
            complete: () => pendingQueue.push(endValue) && checkRunning(),
        })
    })
);

const EmptyObservable = new Observable((subscriber) => subscriber.complete());

class EventStreamClosedError extends Error {
    constructor() {
        super('cannot add new events after calling close');
    }
}

class BlocObserver {
    onEvent(_bloc, _event) { }
    onTransition(_bloc, _transition) { }
    onError(_bloc, _error) { }
}

class Bloc {
    constructor(_state) {
        this._state = _state;
        this.emitted = false;
        this.eventSubject = new Subject();
        this.stateSubject = new Subject();
        this.transitionUnSubscription = noop;
        this.bindStateSubject();
    }
    get state() {
        return this._state;
    }
    listen(onData, onError, onDone) {
        return this.stateSubject.subscribe(onData, onError, onDone);
    }
    add(event) {
        try {
            if (this.eventSubject.isStopped) {
                throw new EventStreamClosedError();
            }
            this.onEvent(event);
            this.eventSubject.next(event);
        } catch (error) {
            this.onError(error);
        }
    }
    transformEvents(events, next) {
        return events.pipe(concatMap(next));
    }
    transformTransitions(transitions) {
        return transitions;
    }
    onEvent(event) {
        Bloc.observer.onEvent(this, event);
    }
    onTransition(transition) {
        Bloc.observer.onTransition(this, transition);
    }
    onError(error) {
        Bloc.observer.onError(this, error);
    }
    close() {
        this.stateSubject.complete();
        this.eventSubject.complete();
        this.transitionUnSubscription();
    }
    bindStateSubject() {
        this.transitionUnSubscription = this.transformTransitions(
            this.transformEvents(this.eventSubject, (event) => {
                return asyncToObservable(this.mapEventToState(event)).pipe(map((nextState, _) => {
                    return new Transition(this.state, event, nextState);
                }), catchError(error => {
                    this.onError(error);
                    return EmptyObservable;
                }));
            })
        ).subscribe((transition) => {
            if (transition.nextState !== this.state || !this.emitted) {
                try {
                    this.onTransition(transition);
                    this._state = transition.nextState;
                    this.stateSubject.next(transition.nextState);
                } catch (error) {
                    this.onError(error);
                }
                this.emitted = true;
            }
        });
    }
}

Bloc.observer = new BlocObserver();

function asyncToObservable(iterable) {
    return new Observable(subscriber => void (async () => {
        try {
            for await (const item of iterable) {
                if (subscriber.closed) {
                    return;
                }
                subscriber.next(item);
            }
            subscriber.complete();
        } catch (e) {
            subscriber.error(e);
        }
    })());
}

export class Transition {
    constructor(currentState, event, nextState) {
        this.currentState = currentState;
        this.event = event;
        this.nextState = nextState;
    }
}

const True = () => true;
export const createBlocStore = (shouldMemo) => {
    const fallbackContext = {};
    const BlocContext = React.createContext(fallbackContext);
    const BlocProvider = props => {
        return (
            <BlocContext.Provider value={props.value}>
                {props.children}
            </BlocContext.Provider>
        )
    };

    const useBloc = (condition = True) => {
        const bloc = React.useContext(BlocContext)
        if (bloc === fallbackContext) {
            console.error("Failed to retrieve the store data from context.")
        }
        const [blocState, setBlocState] = React.useState(bloc.state);
        const previousState = React.useRef(bloc.state);
        previousState.current = bloc.state;
        
        React.useEffect(() => {
            return bloc.listen((state) => {
                const rebuild = condition(previousState.current, state);
                if (rebuild) {
                    setBlocState(state);
                }
            });
        }, [bloc, condition])
        return [previousState.current, blocState];
    };
    return [useBloc, shouldMemo ? React.memo(BlocProvider) : BlocProvider]
}
export const BlocBuilder = React.memo(function BlocBuilder(props) {
    const { bloc, condition = True, children } = props;
    const previousState = React.useRef(bloc.state);
    const [blocState, setBlocState] = React.useState(bloc.state);
    previousState.current = bloc.state;

    React.useEffect(() => {
        return bloc.listen((state) => {
            const rebuild = condition(previousState.current, state);
            if (rebuild) {
                setBlocState(state);
            }
        });
    }, [bloc, condition])

    return children(previousState.current, blocState);
});