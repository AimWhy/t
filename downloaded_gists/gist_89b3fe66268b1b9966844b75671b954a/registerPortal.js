import { Emitter } from '@rocket.chat/emitter';
import { Random } from 'meteor/random';
const createPortalsSubscription = () => {
    const portalsMap = new Map();
    let portals = Array.from(portalsMap.values());
    const emitter = new Emitter();
    return {
        getSnapshot: () => portals,
        subscribe: (callback) => emitter.on('update', callback),
        delete: (key) => {
            portalsMap.delete(key);
            portals = Array.from(portalsMap.values());
            emitter.emit('update');
        },
        set: (key, portal) => {
            portalsMap.set(key, { portal, key: Random.id() });
            portals = Array.from(portalsMap.values());
            emitter.emit('update');
        },
        has: (key) => portalsMap.has(key),
    };
};
export const portalsSubscription = createPortalsSubscription();
export const unregisterPortal = (key) => {
    portalsSubscription.delete(key);
};
export const registerPortal = (key, portal) => {
    portalsSubscription.set(key, portal);
    return () => {
        unregisterPortal(key);
    };
};