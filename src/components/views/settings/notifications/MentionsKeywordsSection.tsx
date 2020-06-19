/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, {useRef, useState} from "react";

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import StyledCheckbox from "../../elements/StyledCheckbox";
import AccessibleButton from "../../elements/AccessibleButton";
import {Key} from "../../../../Keyboard";

interface IProps {
    disabled?: boolean;
}

interface IKeywordsEditorProps {
    keywords: string[];
    setKeywords(keywords: string[]);
}

interface KeywordPill {
    keyword: string;
    onRemove(keyword: string);
}

const KeywordPill: React.FC<KeywordPill> = ({keyword, onRemove}) => {
    const onClick = e => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        onRemove(keyword);
    }

    return (
        <span className="mx_NotificationsTab_mentionsKeywords_keywordPill">
            <span>{keyword}</span>
            <AccessibleButton className="mx_NotificationsTab_mentionsKeywords_removePill" onClick={onClick}>
                <img src={require("../../../../../res/img/icon-pill-remove.svg")} alt={_t("Remove")} width={8} height={8} />
            </AccessibleButton>
        </span>
    );
};

const KeywordsEditor: React.FC<IKeywordsEditorProps> = ({keywords, setKeywords}) => {
    const ref = useRef<HTMLTextAreaElement>();
    const [value, setValue] = useState("");

    const addKeyword = keyword => {
        keyword = keyword.trim();
        if (!keyword || keywords.includes(keyword)) return;
        setKeywords([...keywords, keyword]);
    };
    const removeKeyword = keyword => {
        setKeywords(keywords.filter(k => k !== keyword));
    };

    const onClick = e => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        if (ref.current) {
            ref.current.focus();
        }
    };
    const onChange = e => {
        setValue(e.target.value);
    };
    const onKeyDown = e => {
        // when the field is empty and the user hits backspace remove the right-most target
        if (e.key === Key.BACKSPACE && !value && keywords.length > 0 && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
            e.preventDefault();
            removeKeyword(keywords[keywords.length - 1]);
        } else if (e.key === Key.SPACE || e.key === Key.ENTER) {
            e.preventDefault();
            addKeyword(e.target.value);
            setValue("");
        }
    }
    const onBlur = e => {
        if (value) {
            addKeyword(e.target.value);
            setValue("");
        }
    };

    return <div className="mx_NotificationsTab_mentionsKeywords_editor" onClick={onClick}>
        {keywords.map(k => <KeywordPill key={k} keyword={k} onRemove={removeKeyword} />)}
        <textarea
            rows={1}
            onKeyDown={onKeyDown}
            onChange={onChange}
            value={value}
            ref={ref}
            onBlur={onBlur}
        />
    </div>;
};

const MentionsKeywordsSection: React.FC<IProps> = ({disabled}) => {
    // TODO wire up to push rules
    const [keywords, setKeywords] = useState<string[]>(["foobar"]);

    return <SettingsSection title={_t("Mentions & Keywords")} className="mx_NotificationsTab_mentionsKeywords">
        <StyledCheckbox>
            {_t("Notify when someone mentions using @")}
        </StyledCheckbox>
        <StyledCheckbox disabled={disabled}>
            {_t("Notify when someone uses a keyword")}
        </StyledCheckbox>
        <div className="mx_Checkbox_microCopy">
            {_t("Enter keywords here, or use for spelling variations or nicknames")}
        </div>

        <KeywordsEditor keywords={keywords} setKeywords={setKeywords} />
    </SettingsSection>;
};

export default MentionsKeywordsSection;
