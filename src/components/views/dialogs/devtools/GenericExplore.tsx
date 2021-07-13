/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { useState } from "react";

import FilteredList from "./FilteredList";
import { IDevtool } from "./index";
import { _t } from "../../../../languageHandler";

export interface IProps {
    keys: Iterable<string>;
    onBack(tool?: IDevtool): void;
    renderCreateNew?(onBack: () => void): JSX.Element;
    renderTarget?(key: string, onBack: () => void): JSX.Element;
}

export interface IState {
    message?: string;
}

const GenericExplore = ({ keys, renderCreateNew, onBack: _onBack, renderTarget }: IProps) => {
    const [query, setQuery] = useState("");
    const [selectedKey, setSelectedKey] = useState<string>(undefined);
    const [creating, setCreating] = useState(false);

    const onBack = () => {
        if (creating) {
            setCreating(false);
        } else if (selectedKey) {
            setSelectedKey(undefined);
        } else {
            _onBack();
        }
    };

    if (creating) return renderCreateNew(onBack);
    if (selectedKey) return renderTarget(selectedKey, onBack);

    return <div>
        <div className="mx_Dialog_content">
            <FilteredList query={query} onChange={setQuery}>
                { Array.from(keys).map((key) => {
                    if (renderTarget) {
                        return <button key={key} onClick={() => setSelectedKey(key)}>
                            { key }
                        </button>;
                    }

                    return <div key={key} className="">{ key }</div>;
                }) }
            </FilteredList>
        </div>
        <div className="mx_Dialog_buttons">
            { renderCreateNew && <button onClick={() => setCreating(true)}>{ _t("New") }</button> }
            <button onClick={onBack}>{ _t("Back") }</button>
        </div>
    </div>;
};

export default GenericExplore;
