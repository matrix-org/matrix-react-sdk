/**
 * A mutex lock for coordination across async functions
 */
export default class AwaitLock {
    #private;
    /**
     * Whether the lock is currently acquired or not. Accessing this property does not affect the
     * status of the lock.
     */
    get acquired(): boolean;
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
    acquireAsync({ timeout }?: {
        timeout?: number;
    }): Promise<void>;
    /**
     * Acquires the lock if it is free and otherwise returns immediately without waiting. Returns
     * `true` if the lock was free and is now acquired, and `false` otherwise.
     *
     * This method differs from calling `acquireAsync` with a zero-millisecond timeout in that it runs
     * synchronously without waiting for the JavaScript task queue.
     */
    tryAcquire(): boolean;
    /**
     * Releases the lock and gives it to the next waiting acquirer, if there is one. Each acquirer
     * must release the lock exactly once.
     */
    release(): void;
}
