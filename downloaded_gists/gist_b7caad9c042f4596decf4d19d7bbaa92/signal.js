let RootBatches = null;
const batch = fn => {
    const isRoot = RootBatches === null;
    if (isRoot) {
        RootBatches = new Set;
    }

    try {
        fn()
    } finally {
        if (isRoot) {
            const effects = RootBatches;
            RootBatches = null
            for (const effect of effects) {
                effect.fn();
            }
        }
    }
};

const cleared = self => {
    const entries = [...self];
    self.clear();
    return entries;
};

class Effect extends Set {
    constructor(fn) { super().fn = fn }
    dispose() {
        for (const entry of cleared(this)) {
            entry.delete(this);
            entry.dispose?.();
        }
    }
}

let EffectCurrent = null;
const create = (block) => {
    const fx = new Effect(() => {
        const prev = EffectCurrent;
        EffectCurrent = fx;
        try {
            block()
        } finally {
            EffectCurrent = prev
        }
    });
    return fx;
};

const effect = (fn) => {
    let teardown;
    const fx = create(() => {
        teardown?.call?.();
        teardown = fn()
    });
    if (EffectCurrent) {
        EffectCurrent.add(fx);
    }
    fx.fn()
    return () => (teardown?.call?.(), fx.dispose());
};

const untracked = (fn) => {
    let result;
    const prev = EffectCurrent

    EffectCurrent = null
    result = fn()
    EffectCurrent = prev

    return result
}

class Signal extends Set {
    constructor(v) { super().v = v }

    get value() {
        if (EffectCurrent) {
            EffectCurrent.add(this.add(EffectCurrent));
        }
        return this.v;
    }

    set value(_) {
        if (this.v !== _) {
            this.v = _;
            const isRoot = RootBatches === null;
            for (const effect of cleared(this)) {
                if (isRoot) {
                    effect.fn();
                } else {
                    RootBatches.add(effect);
                }
            }
        }
    }

    // EXPLICIT NO SIDE EFFECT
    peek() { return this.v }

    // IMPLICIT SIDE EFFECT
    toJSON() { return this.value }
    valueOf() { return this.value }
    toString() { return String(this.value) }
}

const signal = value => new Signal(value);

class Computed extends Signal {
    constructor(fn, value) {
        super(value).g = fn;
        this.e = null;
    }

    get value() {
        if (!this.e) {
            this.e = create(() => { super.value = this.g(this.v) })
            this.e.run();
        }
        return super.value;
    }

    set value(_) { throw new Error('computed is read-only') }
}

const computed = (fn, value) => new Computed(fn, value);



/****************************/
const single = signal(1);
const double = signal(10);
const triple = signal(100);

const dispose1 = effect(() => {
    console.log(`
  #1 effect
    single: ${single}
    double: ${double}
  `);
});

const dispose2 = effect(() => {
    console.log(`
  #2 effect
    double: ${double}
    triple: ${triple}
  `);
});

++double.value;

dispose2();

++double.value;
