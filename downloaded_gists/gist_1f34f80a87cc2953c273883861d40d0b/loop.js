export const raf = {
    now: () => now(),
    tasks: new Set(),
    tick: (_) => requestAnimationFrame(_)
};

function run_tasks(now) {
    raf.tasks.forEach((task) => {
        if (!task.c(now)) {
            raf.tasks.delete(task);
            task.f();
        }
    });

    if (raf.tasks.size !== 0) {
        raf.tick(run_tasks);
    }
}

/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
export function loop(callback) {
    let task;

    if (raf.tasks.size === 0) {
        raf.tick(run_tasks);
    }

    return {
        promise: new Promise((fulfill) => {
            raf.tasks.add((task = { c: callback, f: fulfill }));
        }),
        abort() {
            raf.tasks.delete(task);
        }
    };
}