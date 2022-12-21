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

import React from "react";

import { _t } from "../../../languageHandler";
import * as recent from "../../../emojipicker/recent";
import { DATA_BY_CATEGORY, getEmojiFromUnicode, IEmoji } from "../../../emoji";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import Header from "./Header";
import Search from "./Search";
import Preview from "./Preview";
import QuickReactions from "./QuickReactions";
import Category, { ICategory, CategoryKey } from "./Category";
import { Room } from './matrix-js-sdk/src/models/room';
import { MatrixClient } from "matrix-js-sdk/src/client";
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import RoomContext from '../../../contexts/RoomContext';
import { mediaFromMxc } from '../../../customisations/Media';
import { decryptFile } from '../../../utils/DecryptFile';
import { MatrixClientPeg } from '../../../MatrixClientPeg';

export const CATEGORY_HEADER_HEIGHT = 20;
export const EMOJI_HEIGHT = 35;
export const EMOJIS_PER_ROW = 8;

const ZERO_WIDTH_JOINER = "\u200D";

interface IProps {
    selectedEmojis?: Set<string>;
    showQuickReactions?: boolean;
    onChoose(unicode: string): boolean;
    isEmojiDisabled?: (unicode: string) => boolean;
    room?:Room;
}

interface IState {
    filter: string;
    previewEmoji?: IEmoji;
    scrollTop: number;
    // initial estimation of height, dialog is hardcoded to 450px height.
    // should be enough to never have blank rows of emojis as
    // 3 rows of overflow are also rendered. The actual value is updated on scroll.
    viewportHeight: number;
}

class EmojiPicker extends React.Component<IProps, IState> {
    private recentlyUsed: IEmoji[];
    private readonly memoizedDataByCategory: Record<CategoryKey, IEmoji[]>;
    private readonly categories: ICategory[];

    private scrollRef = React.createRef<AutoHideScrollbar<"div">>();

    private emotes: Map<string, React.Component>;
    private emotesPromise: Promise<Map<string, string>>;
    private finalEmotes: IEmoji[];
    private finalEmotesMap:Map<string,IEmoji>;
    constructor(props: IProps) {
        super(props);


        const emotesEvent = props.room?.currentState.getStateEvents("m.room.emotes", "");
        const rawEmotes = emotesEvent ? (emotesEvent.getContent() || {}) : {};
        this.emotesPromise = this.decryptEmotes(rawEmotes, props.room?.roomId);
        this.finalEmotes=[];
        this.finalEmotesMap=new Map<string,IEmoji>();
        this.loadEmotes()

        this.state = {
            filter: "",
            previewEmoji: null,
            scrollTop: 0,
            viewportHeight: 280,
        };

        // Convert recent emoji characters to emoji data, removing unknowns and duplicates
        this.recentlyUsed = Array.from(new Set(recent.get().map(getEmojiFromUnicode).filter(Boolean)));
        this.memoizedDataByCategory = {
            recent: this.recentlyUsed,
            custom: this.finalEmotes,
            ...DATA_BY_CATEGORY,
        };

        this.categories = [{
            id: "recent",
            name: _t("Frequently Used"),
            enabled: true,
            visible: true,
            ref: React.createRef(),
        },{
            id: "custom",
            name: _t("Custom"),
            enabled: true,
            visible: true,
            ref: React.createRef(),
        },{
            id: "people",
            name: _t("Smileys & People"),
            enabled: true,
            visible: true,
            ref: React.createRef(),
        }, {
            id: "nature",
            name: _t("Animals & Nature"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "foods",
            name: _t("Food & Drink"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "activity",
            name: _t("Activities"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "places",
            name: _t("Travel & Places"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "objects",
            name: _t("Objects"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "symbols",
            name: _t("Symbols"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }, {
            id: "flags",
            name: _t("Flags"),
            enabled: true,
            visible: false,
            ref: React.createRef(),
        }];
    }

    private async loadEmotes(){
        this.emotes=await this.emotesPromise
        for (const key in this.emotes) {
            this.finalEmotes.push(
                {   label: key,
                    shortcodes: [key],
                    hexcode: key,
                    unicode: ":"+key+":",
                    customLabel:key,
                    customComponent:this.emotes[key]
                }
            );
            this.finalEmotesMap.set((":"+key+":").trim(),{   
                label: key,
                shortcodes: [key],
                hexcode: key,
                unicode: ":"+key+":",
                customLabel:key,
                customComponent:this.emotes[key]
            });
        }

        let rec=Array.from(new Set(recent.get()));
        rec.forEach((v,i)=>{
            if(this.finalEmotesMap.get(v as string)){
                if(i>=this.recentlyUsed.length){
                    this.recentlyUsed.push(this.finalEmotesMap.get(v as string))
                }
                else{
                    this.recentlyUsed[i]=this.finalEmotesMap.get(v as string)
                }
                
            } else if(getEmojiFromUnicode(v as string)){
                if(i>=this.recentlyUsed.length){
                    this.recentlyUsed.push(getEmojiFromUnicode(v as string))
                }
                else{
                    this.recentlyUsed[i]=getEmojiFromUnicode(v as string)
                }    
            }
        })
        this.onScroll();  
    }

    private async decryptEmotes(emotes: Object, roomId: string) {
        const decryptede=new Map<string, string>();
        const client = MatrixClientPeg.get();
        let durl = "";
        const isEnc=client.isRoomEncrypted(roomId);
        for (const shortcode in emotes) {
            if (isEnc) {
                const blob = await decryptFile(emotes[shortcode]);
                durl = URL.createObjectURL(blob);
            } else {
                durl = mediaFromMxc(emotes[shortcode]).srcHttp;
            }
            decryptede[shortcode] = <img class='mx_Emote' title={":" + shortcode +":"} src= {durl}/>;
        }
        return decryptede;
    }
    
    private onScroll = () => {
        const body = this.scrollRef.current?.containerRef.current;
        this.setState({
            scrollTop: body.scrollTop,
            viewportHeight: body.clientHeight,
        });
        this.updateVisibility();
    };

    private updateVisibility = () => {
        const body = this.scrollRef.current?.containerRef.current;
        const rect = body.getBoundingClientRect();
        for (const cat of this.categories) {
            const elem = body.querySelector(`[data-category-id="${cat.id}"]`);
            if (!elem) {
                cat.visible = false;
                cat.ref.current.classList.remove("mx_EmojiPicker_anchor_visible");
                continue;
            }
            const elemRect = elem.getBoundingClientRect();
            const y = elemRect.y - rect.y;
            const yEnd = elemRect.y + elemRect.height - rect.y;
            cat.visible = y < rect.height && yEnd > 0;
            // We update this here instead of through React to avoid re-render on scroll.
            if (cat.visible) {
                cat.ref.current.classList.add("mx_EmojiPicker_anchor_visible");
                cat.ref.current.setAttribute("aria-selected", "true");
                cat.ref.current.setAttribute("tabindex", "0");
            } else {
                cat.ref.current.classList.remove("mx_EmojiPicker_anchor_visible");
                cat.ref.current.setAttribute("aria-selected", "false");
                cat.ref.current.setAttribute("tabindex", "-1");
            }
        }
    };

    private scrollToCategory = (category: string) => {
        this.scrollRef.current?.containerRef.current
            ?.querySelector(`[data-category-id="${category}"]`)
            .scrollIntoView();
    };

    private onChangeFilter = (filter: string) => {
        const lcFilter = filter.toLowerCase().trim(); // filter is case insensitive
        for (const cat of this.categories) {
            let emojis;
            // If the new filter string includes the old filter string, we don't have to re-filter the whole dataset.
            if (lcFilter.includes(this.state.filter)) {
                emojis = this.memoizedDataByCategory[cat.id];
            } else {
                
                emojis = cat.id === "recent" ? this.recentlyUsed : DATA_BY_CATEGORY[cat.id];
                if(cat.id==="custom"){
                    emojis=this.finalEmotes
                }
            }
            emojis = emojis.filter((emoji) => this.emojiMatchesFilter(emoji, lcFilter));
            this.memoizedDataByCategory[cat.id] = emojis;
            cat.enabled = emojis.length > 0;
            // The setState below doesn't re-render the header and we already have the refs for updateVisibility, so...
            cat.ref.current.disabled = !cat.enabled;
        }
        this.setState({ filter });
        // Header underlines need to be updated, but updating requires knowing
        // where the categories are, so we wait for a tick.
        window.setTimeout(this.updateVisibility, 0);
    };

    private emojiMatchesFilter = (emoji: IEmoji, filter: string): boolean => {
        return (
            emoji.label.toLowerCase().includes(filter) ||
            (Array.isArray(emoji.emoticon)
                ? emoji.emoticon.some((x) => x.includes(filter))
                : emoji.emoticon?.includes(filter)) ||
            emoji.shortcodes.some((x) => x.toLowerCase().includes(filter)) ||
            emoji.unicode.split(ZERO_WIDTH_JOINER).includes(filter)
        );
    };

    private onEnterFilter = () => {
        const btn =
            this.scrollRef.current?.containerRef.current?.querySelector<HTMLButtonElement>(".mx_EmojiPicker_item");
        if (btn) {
            btn.click();
        }
    };

    private onHoverEmoji = (emoji: IEmoji) => {
        this.setState({
            previewEmoji: emoji,
        });
    };

    private onHoverEmojiEnd = (emoji: IEmoji) => {
        this.setState({
            previewEmoji: null,
        });
    };

    private onClickEmoji = (emoji: IEmoji) => {
        if (this.props.onChoose(emoji.unicode) !== false) {
            recent.add(emoji.unicode);
        }
    };

    private static categoryHeightForEmojiCount(count: number) {
        if (count === 0) {
            return 0;
        }
        return CATEGORY_HEADER_HEIGHT + Math.ceil(count / EMOJIS_PER_ROW) * EMOJI_HEIGHT;
    }

    render() {
        let heightBefore = 0;
        return (
            <div className="mx_EmojiPicker" data-testid="mx_EmojiPicker">
                <Header categories={this.categories} onAnchorClick={this.scrollToCategory} />
                <Search query={this.state.filter} onChange={this.onChangeFilter} onEnter={this.onEnterFilter} />
                <AutoHideScrollbar className="mx_EmojiPicker_body" ref={this.scrollRef} onScroll={this.onScroll}>
                    {this.categories.map((category) => {
                        const emojis = this.memoizedDataByCategory[category.id];
                        const categoryElement = (
                            <Category
                                key={category.id}
                                id={category.id}
                                name={category.name}
                                heightBefore={heightBefore}
                                viewportHeight={this.state.viewportHeight}
                                scrollTop={this.state.scrollTop}
                                emojis={emojis}
                                onClick={this.onClickEmoji}
                                onMouseEnter={this.onHoverEmoji}
                                onMouseLeave={this.onHoverEmojiEnd}
                                isEmojiDisabled={this.props.isEmojiDisabled}
                                selectedEmojis={this.props.selectedEmojis}
                            />
                        );
                        const height = EmojiPicker.categoryHeightForEmojiCount(emojis?.length);
                        heightBefore += height;
                        return categoryElement;
                    })}
                </AutoHideScrollbar>
                {this.state.previewEmoji || !this.props.showQuickReactions ? (
                    <Preview emoji={this.state.previewEmoji} />
                ) : (
                    <QuickReactions onClick={this.onClickEmoji} selectedEmojis={this.props.selectedEmojis} />
                )}
            </div>
        );
    }
}

export default EmojiPicker;
