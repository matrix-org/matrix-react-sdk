/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
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

import React, { ComponentProps, ReactNode, useState } from "react";

import { _t } from "../../../../languageHandler";
import Field from "../../elements/Field";

interface IProps {
    defaultEventType?: string;
    defaultContent?: string;
    children?: ReactNode;
    onSend(eventType: string, content: string): Promise<unknown>;
    onBack(): void;
}

const GenericEditor = ({ defaultEventType = "", defaultContent = "{\n\n}", children, onSend, onBack }: IProps) => {
    const [eventType, setEventType] = useState(defaultEventType);
    const [content, setContent] = useState(defaultContent);
    const [message, setMessage] = useState<string>(undefined);
    // TODO field validation eventType, content

    const onWrappedSend = async () => {
        try {
            await onSend(eventType, JSON.parse(content));
            setMessage(_t('Event sent!'));
        } catch (e) {
            setMessage(_t('Failed to send custom event.') + ' (' + e.toString() + ')');
        }
    };

    const onWrappedBack = () => {
        if (message) {
            setMessage(undefined);
        } else {
            onBack();
        }
    };

    const buttons = <div className="mx_Dialog_buttons">
        <button onClick={onWrappedBack}>{ _t("Back") }</button>
        { !message && <button onClick={onWrappedSend}>{ _t("Send") }</button> }
    </div>;

    if (message) {
        return <div>
            <div className="mx_Dialog_content">
                { message }
            </div>
            { buttons }
        </div>;
    }

    return <div>
        <div className="mx_Dialog_content">
            <div className="mx_Devtools_eventTypeStateKeyGroup">
                <Field
                    label={_t("Event type")}
                    autoFocus={true}
                    type="text"
                    autoComplete="on"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                />
                { children }
            </div>

            <Field
                label={_t("Event content")}
                type="text"
                autoComplete="off"
                value={content}
                onChange={e => setContent(e.target.value)}
                element="textarea"
                className="mx_Devtools_textarea"
            />
        </div>
        { buttons }
    </div>;
};

export default GenericEditor;

export type GenericEditorProps = Omit<ComponentProps<typeof GenericEditor>, "onSend" | "onBack">;
