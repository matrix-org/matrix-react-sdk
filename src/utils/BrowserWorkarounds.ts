import { ChangeEvent } from "react";

type OnChangeHandler<T> = (event: ChangeEvent<HTMLInputElement>) => T;

export function fileOnChangeHandler<T>(handler: OnChangeHandler<T>): OnChangeHandler<T> {
    return (event) => {
        const result = handler(event);
        // Workaround for Chromium Bug
        // Chrome does not fire onChange events if the same file is selected twice
        // Only required on Chromium-based browsers (Electron, Chrome, Edge, Opera, Vivaldi, etc)
        event.target.value = '';
        return result;
    };
}
