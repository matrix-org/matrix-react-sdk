/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { isEqual } from "lodash";
import React, {
    createContext, Dispatch,
    Fragment,
    PropsWithChildren,
    ReactNode,
    Reducer,
    ReducerState,
    useContext,
    useEffect,
    useReducer,
} from "react";

interface AuthHeaderContextValue {
    title: ReactNode;
    icon?: ReactNode;
    hideServerPicker?: boolean;
}

enum AuthHeaderContextActionType {
    ADD,
    REMOVE
}

interface AuthHeaderContextAction {
    type: AuthHeaderContextActionType;
    value: AuthHeaderContextValue;
}

type AuthContextReducer = Reducer<AuthHeaderContextValue[], AuthHeaderContextAction>;

interface AuthHeaderContextType {
    state: ReducerState<AuthContextReducer>;
    dispatch: Dispatch<AuthHeaderContextAction>;
}

const AuthHeaderContext = createContext<AuthHeaderContextType>(undefined);

export function AuthHeader(content: AuthHeaderContextValue) {
    const context = useContext(AuthHeaderContext);
    const dispatch = context ? context.dispatch : null;
    useEffect(() => {
        if (!dispatch) {
            return;
        }
        dispatch({ type: AuthHeaderContextActionType.ADD, value: content });
        return () => dispatch({ type: AuthHeaderContextActionType.REMOVE, value: content });
    }, [content, dispatch]);
    return null;
}

interface Props {
    title: ReactNode;
    icon?: ReactNode;
    serverPicker: ReactNode;
}

export function AuthHeaderDisplay({ title, icon, serverPicker, children }: PropsWithChildren<Props>) {
    const context = useContext(AuthHeaderContext);
    if (!context) {
        return null;
    }
    const current = context.state.length ? context.state[0] : null;
    return (
        <Fragment>
            { current?.icon ?? icon }
            <h2>{ current?.title ?? title }</h2>
            { children }
            { current?.hideServerPicker !== true && serverPicker }
        </Fragment>
    );
}

export function AuthHeaderProvider({ children }: PropsWithChildren<{}>) {
    const [state, dispatch] = useReducer<AuthContextReducer>(
        (state: AuthHeaderContextValue[], action: AuthHeaderContextAction) => {
            switch (action.type) {
                case AuthHeaderContextActionType.ADD:
                    return [action.value, ...state];
                case AuthHeaderContextActionType.REMOVE:
                    return (state.length && isEqual(state[0], action.value)) ? state.slice(1) : state;
            }
        },
        [] as AuthHeaderContextValue[],
    );
    return (
        <AuthHeaderContext.Provider value={{ state, dispatch }}>
            { children }
        </AuthHeaderContext.Provider>
    );
}
