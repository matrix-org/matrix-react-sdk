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

import React, { useContext, useState } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import { _td } from "../../../../languageHandler";
import GenericEditor from "./GenericEditor";
import GenericExplore from "./GenericExplore";
import { ICategory, IDevtool, IProps as IDevtoolProps } from "./index";
import { ISendCustomEventProps, SendCustomStateEventTool, ViewSource } from "./RoomCategory";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";

const SendAccountDataEventTool: IDevtool<ISendCustomEventProps> = {
    label: _td("Send room account data"),
    Component: ({ onBack, defaultEventType, defaultContent }: ISendCustomEventProps) => {
        const cli = useContext(MatrixClientContext);
        const onSend = (eventType: string, content: string) => {
            return cli.setAccountData(eventType, content);
        };

        return <GenericEditor
            onSend={onSend}
            onBack={onBack}
            defaultEventType={defaultEventType}
            defaultContent={defaultContent}
        />;
    },
};

const ExploreAccountDataTool: IDevtool = {
    label: _td("Explore room account data"),
    Component: ({ onBack }: IDevtoolProps) => {
        const cli = useContext(MatrixClientContext);
        const [editing, setEditing] = useState<MatrixEvent>(undefined);
        const accountData = cli.store.accountData;

        return <GenericExplore
            keys={Object.keys(accountData)}
            onBack={onBack}
            renderCreateNew={onBack => <SendCustomStateEventTool.Component onBack={onBack} />}
            renderTarget={(eventType, onBack) => {
                const ev = accountData[eventType];
                if (editing) {
                    return <SendAccountDataEventTool.Component
                        onBack={onBack}
                        defaultEventType={ev.getType()}
                        defaultContent={JSON.stringify(ev.getContent())}
                    />;
                }
                return <ViewSource mxEvent={ev} onBack={onBack} onEdit={() => setEditing(ev)} />;
            }}
        />;
    },
};

const AccountCategory: ICategory = {
    label: _td("Account"),
    tools: [
        ExploreAccountDataTool,
    ],
};

export default AccountCategory;
