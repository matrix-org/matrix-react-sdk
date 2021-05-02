/*
Copyright 2019 Tulir Asokan <tulir@maunium.net>
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

import React from 'react';

import { _t } from '../../../languageHandler';
import {getEmojiFromUnicode, IEmoji} from "../../../emoji";
import Emoji from "./Emoji";
import {replaceableComponent} from "../../../utils/replaceableComponent";

// We use the variation-selector Heart in Quick Reactions for some reason
const QUICK_REACTIONS = ["👍", "👎", "😄", "🎉", "😕", "❤️", "🚀", "👀"].map(emoji => {
    const data = getEmojiFromUnicode(emoji);
    if (!data) {
        throw new Error(`Emoji ${emoji} doesn't exist in emojibase`);
    }
    return data;
});

interface IProps {
    selectedEmojis?: Set<string>;
    onClick(emoji: IEmoji): void;
}

interface IState {
    hover?: IEmoji;
}

@replaceableComponent("views.emojipicker.QuickReactions")
class QuickReactions extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
        this.state = {
            hover: null,
        };
    }

    private onMouseEnter = (emoji: IEmoji) => {
        this.setState({
            hover: emoji,
        });
    };

    private onMouseLeave = () => {
        this.setState({
            hover: null,
        });
    };

    render() {
        return (
            <section className="mx_EmojiPicker_footer mx_EmojiPicker_quick mx_EmojiPicker_category">
                <h2 className="mx_EmojiPicker_quick_header mx_EmojiPicker_category_label">
                    {!this.state.hover
                        ? _t("Quick Reactions")
                        : <React.Fragment>
                            <span className="mx_EmojiPicker_name">{this.state.hover.annotation}</span>
                            <span className="mx_EmojiPicker_shortcode">{this.state.hover.shortcodes[0]}</span>
                        </React.Fragment>
                    }
                </h2>
                <ul className="mx_EmojiPicker_list" aria-label={_t("Quick Reactions")}>
                    {QUICK_REACTIONS.map(emoji => ((
                        <Emoji
                            key={emoji.hexcode}
                            emoji={emoji}
                            onClick={this.props.onClick}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            selectedEmojis={this.props.selectedEmojis}
                        />
                    )))}
                </ul>
            </section>
        );
    }
}

export default QuickReactions;
