/*
Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { useRef, useEffect, useState, useCallback } from "react";
import { ListenerMap, TypedEventEmitter } from "matrix-js-sdk/src/models/typed-event-emitter";

import type { EventEmitter } from "events";

type Handler = (...args: any[]) => void;

export function useTypedEventEmitter<
    Events extends string,
    Arguments extends ListenerMap<Events>,
>(
    emitter: TypedEventEmitter<Events, Arguments>,
    eventName: Events,
    handler: Handler,
): void {
    useEventEmitter(emitter, eventName, handler);
}

/**
 * Hook to wrap an EventEmitter/EventTarget on/addEventListener and
 * off/removeEventListener in hook lifecycle
 */
export function useEventEmitter(
    emitter: EventTarget | undefined,
    eventName: string,
    handler: Handler,
): void;
export function useEventEmitter(
    emitter: EventEmitter | undefined,
    eventName: string | symbol,
    handler: Handler,
): void;
export function useEventEmitter(
    emitter: EventEmitter | EventTarget | undefined,
    eventName: string | symbol,
    handler: Handler,
): void {
    // Create a ref that stores handler
    const savedHandler = useRef(handler);

    // Update ref.current value if handler changes.
    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(
        () => {
            // allow disabling this hook by passing a falsy emitter
            if (!emitter) return;

            // Create event listener that calls handler function stored in ref
            const eventListener = (...args) => savedHandler.current(...args);

            // XXX: We cannot use instanceof as that would break tests
            // Add event listener
            if ((emitter as EventTarget).addEventListener && typeof eventName === "string") {
                (emitter as EventTarget).addEventListener(eventName as string, eventListener);
            } else if ((emitter as EventEmitter).on) {
                (emitter as EventEmitter).on(eventName, eventListener);
            }

            // XXX: We cannot use instanceof as that would break tests
            // Remove event listener on cleanup
            return () => {
                if ((emitter as EventTarget).removeEventListener && typeof eventName === "string") {
                    (emitter as EventTarget).removeEventListener(eventName, eventListener);
                } else if ((emitter as EventEmitter).off) {
                    (emitter as EventEmitter).off(eventName, eventListener);
                }
            };
        },
        [eventName, emitter], // Re-run if eventName or emitter changes
    );
}

type Mapper<T> = (...args: any[]) => T;

export function useTypedEventEmitterState<
    T,
    Events extends string,
    Arguments extends ListenerMap<Events>,
>(
    emitter: TypedEventEmitter<Events, Arguments>,
    eventName: Events,
    fn: Mapper<T>,
): T {
    return useEventEmitterState<T>(emitter, eventName, fn);
}

export function useEventEmitterState<T>(
    emitter: EventEmitter | undefined,
    eventName: string | symbol,
    fn: Mapper<T>,
): T {
    const [value, setValue] = useState<T>(fn());
    const handler = useCallback((...args: any[]) => {
        setValue(fn(...args));
    }, [fn]);
    // re-run when the emitter changes
    useEffect(handler, [emitter]); // eslint-disable-line react-hooks/exhaustive-deps
    useEventEmitter(emitter, eventName, handler);
    return value;
}

export function useEventTargetState<T>(
    emitter: EventTarget | undefined,
    eventName: string,
    fn: Mapper<T>,
): T {
    const [value, setValue] = useState<T>(fn());
    const handler = useCallback((...args: any[]) => {
        setValue(fn(...args));
    }, [fn]);
    // re-run when the emitter changes
    useEffect(handler, [emitter]); // eslint-disable-line react-hooks/exhaustive-deps
    useEventEmitter(emitter, eventName, handler);
    return value;
}
