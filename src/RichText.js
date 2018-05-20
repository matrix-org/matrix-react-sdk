/*
Copyright 2015 - 2017 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018 New Vector Ltd

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

import * as sdk from './index';
import * as emojione from 'emojione';

import { Value } from 'slate';

import _Html from 'slate-html-serializer';
import _Md from 'slate-md-serializer';
import Plain from 'slate-plain-serializer';
import PlainWithPillsSerializer from "../../../autocomplete/PlainWithPillsSerializer";

// the Slate node type to default to for unstyled text
const DEFAULT_NODE = 'paragraph';

const PlainWithMdPills    = new PlainWithPillsSerializer({ pillFormat: 'md' });
const PlainWithIdPills    = new PlainWithPillsSerializer({ pillFormat: 'id' });
const PlainWithPlainPills = new PlainWithPillsSerializer({ pillFormat: 'plain' });

const Md = new _Md({
    rules: [
        {
            serialize: (obj, children) => {
                if (obj.object === 'string') {
                    // escape any MD in it. i have no idea why the serializer doesn't
                    // do this already.
                    // TODO: this can probably be more robust - it doesn't consider
                    // indenting or lists for instance.
                    return children.replace(/([*_~`+])/g, '\\$1')
                                   .replace(/^([>#\|])/g, '\\$1');
                }
                else if (obj.object === 'inline') {
                    switch (obj.type) {
                        case 'pill':
                            return `[${ obj.data.get('completion') }](${ obj.data.get('href') })`;
                        case 'emoji':
                            return obj.data.get('emojiUnicode');
                    }
                }
            }
        }
    ]
});

const Html = new _Html({
    rules: [
        {
            deserialize: (el, next) => {
                const tag = el.tagName.toLowerCase();
                let type = BLOCK_TAGS[tag];
                if (type) {
                    return {
                        object: 'block',
                        type: type,
                        nodes: next(el.childNodes),
                    }
                }
                type = MARK_TAGS[tag];
                if (type) {
                    return {
                        object: 'mark',
                        type: type,
                        nodes: next(el.childNodes),
                    }
                }
                // special case links
                if (tag === 'a') {
                    const href = el.getAttribute('href');
                    let m;
                    if (href) {
                        m = href.match(MATRIXTO_URL_PATTERN);
                    }
                    if (m) {
                        return {
                            object: 'inline',
                            type: 'pill',
                            data: {
                                href,
                                completion: el.innerText,
                                completionId: m[1],
                            },
                            isVoid: true,
                        }
                    }
                    else {
                        return {
                            object: 'inline',
                            type: 'link',
                            data: { href },
                            nodes: next(el.childNodes),
                        }
                    }
                }
            },
            serialize: (obj, children) => {
                if (obj.object === 'block') {
                    return this.renderNode({
                        node: obj,
                        children: children,
                    });
                }
                else if (obj.object === 'mark') {
                    return this.renderMark({
                        mark: obj,
                        children: children,
                    });
                }
                else if (obj.object === 'inline') {
                    // special case links, pills and emoji otherwise we
                    // end up with React components getting rendered out(!)
                    switch (obj.type) {
                        case 'pill':
                            return <a href={ obj.data.get('href') }>{ obj.data.get('completion') }</a>;
                        case 'link':
                            return <a href={ obj.data.get('href') }>{ children }</a>;
                        case 'emoji':
                            // XXX: apparently you can't return plain strings from serializer rules
                            // until https://github.com/ianstormtaylor/slate/pull/1854 is merged.
                            // So instead we temporarily wrap emoji from RTE in an arbitrary tag
                            // (<b/>).  <span/> would be nicer, but in practice it causes CSS issues.
                            return <b>{ obj.data.get('emojiUnicode') }</b>;
                    }
                    return this.renderNode({
                        node: obj,
                        children: children,
                    });
                }
            }
        }
    ]
});


export function htmlToRichEditorState(html) {

}

export function richEditorStateToHtml(editorState) {
    
}

export function richEditorStateToMd(editorState) {
    
}

export function mdEditorStateToPlain(md, pillType) {
}

export function mdToRichEditorState(editorState: EditorState): EditorState {
    // for consistency when roundtripping, we could use slate-md-serializer rather than
    // commonmark, but then we would lose pills as the MD deserialiser doesn't know about
    // them and doesn't have any extensibility hooks.
    //
    // The code looks like this:
    //
    // const markdown = this.plainWithMdPills.serialize(this.state.editorState);
    //
    // // weirdly, the Md serializer can't deserialize '' to a valid Value...
    // if (markdown !== '') {
    //     editorState = this.md.deserialize(markdown);
    // }
    // else {
    //     editorState = Plain.deserialize('', { defaultBlock: DEFAULT_NODE });
    // }

    // so, instead, we use commonmark proper (which is arguably more logical to the user
    // anyway, as they'll expect the RTE view to match what they'll see in the timeline,
    // but the HTML->MD conversion is anyone's guess).

    const sourceWithPills = PlainWithMdPills.serialize(this.state.editorState);
    const markdown = new Markdown(sourceWithPills);
    editorState = this.html.deserialize(markdown.toHTML());
}

export function richToMdEditorState(editorState: EditorState): EditorState {
    // FIXME: this should be turning pills & emoji into nodes - i.e. we should add a
    // custom deserializer to PlainWithMdPills.
    editorState = Plain.deserialize(
        Md.serialize(editorState),
        { defaultBlock: DEFAULT_NODE }
    );
}


export function unicodeToEmojiUri(str) {
    let replaceWith, unicode, alt;
    if ((!emojione.unicodeAlt) || (emojione.sprites)) {
        // if we are using the shortname as the alt tag then we need a reversed array to map unicode code point to shortnames
        const mappedUnicode = emojione.mapUnicodeToShort();
    }

    str = str.replace(emojione.regUnicode, function(unicodeChar) {
        if ( (typeof unicodeChar === 'undefined') || (unicodeChar === '') || (!(unicodeChar in emojione.jsEscapeMap)) ) {
            // if the unicodeChar doesnt exist just return the entire match
            return unicodeChar;
        } else {
            // Remove variant selector VS16 (explicitly emoji) as it is unnecessary and leads to an incorrect URL below
            if (unicodeChar.length == 2 && unicodeChar[1] == '\ufe0f') {
                unicodeChar = unicodeChar[0];
            }

            // get the unicode codepoint from the actual char
            unicode = emojione.jsEscapeMap[unicodeChar];

            return emojione.imagePathSVG+unicode+'.svg'+emojione.cacheBustParam;
        }
    });

    return str;
}
