"use strict";

function v86(bus, wasm) {
    this.running = false;
    this.stopping = false;
    this.idle = true;
    this.tick_counter = 0;
    this.worker = null;

    this.bus = bus;
    this.cpu = new CPU(this.bus, wasm, () => { this.idle && this.next_tick(0); });

    this.register_yield();
}

v86.prototype.run = function () {
    this.stopping = false;

    if (!this.running) {
        this.running = true;
        this.bus.send("emulator-started");
    }

    this.next_tick(0);
};

v86.prototype.do_tick = function () {
    if (this.stopping || !this.running) {
        this.stopping = this.running = false;
        this.bus.send("emulator-stopped");
        return;
    }

    this.idle = false;
    const t = this.cpu.main_loop();

    this.next_tick(t);
};

v86.prototype.next_tick = function (t) {
    const tick = ++this.tick_counter;
    this.idle = true;
    this.yield(t, tick);
};

v86.prototype.yield_callback = function (tick) {
    if (tick === this.tick_counter) {
        this.do_tick();
    }
};

v86.prototype.stop = function () {
    if (this.running) {
        this.stopping = true;
    }
};

v86.prototype.destroy = function () {
    this.unregister_yield();
};

v86.prototype.restart = function () {
    this.cpu.reset_cpu();
    this.cpu.load_bios();
};

v86.prototype.init = function (settings) {
    this.cpu.init(settings, this.bus);
    this.bus.send("emulator-ready");
};

function the_worker() {
    let timeout;
    globalThis.onmessage = function (e) {
        const t = e.data.t;
        timeout = timeout && clearTimeout(timeout);
        if (t < 1) postMessage(e.data.tick);
        else timeout = setTimeout(() => postMessage(e.data.tick), t);
    };
}

v86.prototype.register_yield = function () {
    const url = URL.createObjectURL(new Blob(["(" + the_worker.toString() + ")()"], { type: "text/javascript" }));
    this.worker = new Worker(url);
    this.worker.onmessage = e => this.yield_callback(e.data);
    URL.revokeObjectURL(url);
};

v86.prototype.yield = function (t, tick) {
    this.worker.postMessage({ t, tick });
};

v86.prototype.unregister_yield = function () {
    this.worker && this.worker.terminate();
    this.worker = null;
};


v86.prototype.save_state = function () {
    return this.cpu.save_state();
};

v86.prototype.restore_state = function (state) {
    return this.cpu.restore_state(state);
};

v86.microtick = performance.now.bind(performance);
