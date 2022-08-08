"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _AwaitLock_acquired, _AwaitLock_waitingResolvers;
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A mutex lock for coordination across async functions
 */
class AwaitLock {
    constructor() {
        _AwaitLock_acquired.set(this, false);
        _AwaitLock_waitingResolvers.set(this, new Set());
    }
    /**
     * Whether the lock is currently acquired or not. Accessing this property does not affect the
     * status of the lock.
     */
    get acquired() {
        return __classPrivateFieldGet(this, _AwaitLock_acquired, "f");
    }
    /**
     * Acquires the lock, waiting if necessary for it to become free if it is already locked. The
     * returned promise is fulfilled once the lock is acquired.
     *
     * A timeout (in milliseconds) may be optionally provided. If the lock cannot be acquired before
     * the timeout elapses, the returned promise is rejected with an error. The behavior of invalid
     * timeout values depends on how `setTimeout` handles those values.
     *
     * After acquiring the lock, you **must** call `release` when you are done with it.
     */
    acquireAsync({ timeout } = {}) {
        if (!__classPrivateFieldGet(this, _AwaitLock_acquired, "f")) {
            __classPrivateFieldSet(this, _AwaitLock_acquired, true, "f");
            return Promise.resolve();
        }
        if (timeout == null) {
            return new Promise((resolve) => {
                __classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f").add(resolve);
            });
        }
        let resolver;
        let timer;
        return Promise.race([
            new Promise((resolve) => {
                resolver = () => {
                    clearTimeout(timer);
                    resolve();
                };
                __classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f").add(resolver);
            }),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    __classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f").delete(resolver);
                    reject(new Error(`Timed out waiting for lock`));
                }, timeout);
            }),
        ]);
    }
    /**
     * Acquires the lock if it is free and otherwise returns immediately without waiting. Returns
     * `true` if the lock was free and is now acquired, and `false` otherwise.
     *
     * This method differs from calling `acquireAsync` with a zero-millisecond timeout in that it runs
     * synchronously without waiting for the JavaScript task queue.
     */
    tryAcquire() {
        if (!__classPrivateFieldGet(this, _AwaitLock_acquired, "f")) {
            __classPrivateFieldSet(this, _AwaitLock_acquired, true, "f");
            return true;
        }
        return false;
    }
    /**
     * Releases the lock and gives it to the next waiting acquirer, if there is one. Each acquirer
     * must release the lock exactly once.
     */
    release() {
        if (!__classPrivateFieldGet(this, _AwaitLock_acquired, "f")) {
            throw new Error(`Cannot release an unacquired lock`);
        }
        if (__classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f").size > 0) {
            // Sets preserve insertion order like a queue
            const [resolve] = __classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f");
            __classPrivateFieldGet(this, _AwaitLock_waitingResolvers, "f").delete(resolve);
            resolve();
        }
        else {
            __classPrivateFieldSet(this, _AwaitLock_acquired, false, "f");
        }
    }
}
exports.default = AwaitLock;
_AwaitLock_acquired = new WeakMap(), _AwaitLock_waitingResolvers = new WeakMap();
//# sourceMappingURL=AwaitLock.js.map