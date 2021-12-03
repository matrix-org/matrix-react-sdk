/*
Copyright 2015, 2016 OpenMarket Ltd
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

import * as linkifyjs from 'linkifyjs';
import linkifyElement from 'linkifyjs/element';
import linkifyString from 'linkifyjs/string';
import { baseUrl } from "./utils/permalinks/SpecPermalinkConstructor";
import {
    parsePermalink,
    tryTransformEntityToPermalink,
    tryTransformPermalinkToLocalHref,
} from "./utils/permalinks/Permalinks";
import { RoomMember } from 'matrix-js-sdk';
import dis from './dispatcher/dispatcher';
import { Action } from './dispatcher/actions';
import { ViewUserPayload } from './dispatcher/payloads/ViewUserPayload';

enum Type {
    URL = "url",
    UserId = "userid",
    RoomAlias = "roomalias",
    GroupId = "groupid"
}

/**
 * Token should be one of the type of linkify.parser.TOKENS[AT | PLUS | POUND]
 * but due to typing issues it's just not a feasible solution.
 * This problem kind of gets solved in linkify 3.0
 */
function parseFreeformMatrixLinks(linkify, token: '#' | '+' | '@', name: Type): void {
    // Text tokens
    const TT = linkify.scanner.TOKENS;
    const tokens: Record<'#' | '+' | '@', any> = {
        '#': TT.POUND,
        '+': TT.PLUS,
        '@': TT.AT,
    };
    const PARSER_TOKEN = tokens[token];
    // Multi tokens
    const MT = linkify.parser.TOKENS;
    const MultiToken = MT.Base;
    const S_START = linkify.parser.start;

    const TOKEN = function(value) {
        MultiToken.call(this, value);
        this.type = name;
        this.isLink = true;
    };
    TOKEN.prototype = new MultiToken();

    const S_HASH = S_START.jump(PARSER_TOKEN);
    const S_HASH_NAME = new linkify.parser.State();
    const S_HASH_NAME_COLON = new linkify.parser.State();
    const S_HASH_NAME_COLON_DOMAIN = new linkify.parser.State(TOKEN);
    const S_HASH_NAME_COLON_DOMAIN_DOT = new linkify.parser.State();
    const S_ROOMALIAS = new linkify.parser.State(TOKEN);
    const S_ROOMALIAS_COLON = new linkify.parser.State();
    const S_ROOMALIAS_COLON_NUM = new linkify.parser.State(TOKEN);

    const allowedFreeformTokens = [
        TT.DOT,
        TT.PLUS,
        TT.NUM,
        TT.DOMAIN,
        TT.TLD,
        TT.UNDERSCORE,
        PARSER_TOKEN,

        // because 'localhost' is tokenised to the localhost token,
        // usernames @localhost:foo.com are otherwise not matched!
        TT.LOCALHOST,
    ];

    S_HASH.on(allowedFreeformTokens, S_HASH_NAME);
    S_HASH_NAME.on(allowedFreeformTokens, S_HASH_NAME);
    S_HASH_NAME.on(TT.DOMAIN, S_HASH_NAME);

    S_HASH_NAME.on(TT.COLON, S_HASH_NAME_COLON);

    S_HASH_NAME_COLON.on(TT.DOMAIN, S_HASH_NAME_COLON_DOMAIN);
    S_HASH_NAME_COLON.on(TT.LOCALHOST, S_ROOMALIAS); // accept #foo:localhost
    S_HASH_NAME_COLON.on(TT.TLD, S_ROOMALIAS); // accept #foo:com (mostly for (TLD|DOMAIN)+ mixing)
    S_HASH_NAME_COLON_DOMAIN.on(TT.DOT, S_HASH_NAME_COLON_DOMAIN_DOT);
    S_HASH_NAME_COLON_DOMAIN_DOT.on(TT.DOMAIN, S_HASH_NAME_COLON_DOMAIN);
    S_HASH_NAME_COLON_DOMAIN_DOT.on(TT.TLD, S_ROOMALIAS);

    S_ROOMALIAS.on(TT.DOT, S_HASH_NAME_COLON_DOMAIN_DOT); // accept repeated TLDs (e.g .org.uk)
    S_ROOMALIAS.on(TT.COLON, S_ROOMALIAS_COLON); // do not accept trailing `:`
    S_ROOMALIAS_COLON.on(TT.NUM, S_ROOMALIAS_COLON_NUM); // but do accept :NUM (port specifier)
}

function onUserClick(e: MouseEvent, userId: string) {
    const member = new RoomMember(null, userId);
    if (!member) { return; }
    dis.dispatch<ViewUserPayload>({
        action: Action.ViewUser,
        member: member,
    });
}
function onAliasClick(e: MouseEvent, roomAlias: string) {
    event.preventDefault();
    dis.dispatch({ action: 'view_room', room_alias: roomAlias });
}
function onGroupClick(e: MouseEvent, groupId: string) {
    event.preventDefault();
    dis.dispatch({ action: 'view_group', group_id: groupId });
}

const escapeRegExp = function(string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Recognise URLs from both our local and official Element deployments.
// Anyone else really should be using matrix.to.
export const ELEMENT_URL_PATTERN =
    "^(?:https?://)?(?:" +
        escapeRegExp(window.location.host + window.location.pathname) + "|" +
        "(?:www\\.)?(?:riot|vector)\\.im/(?:app|beta|staging|develop)/|" +
        "(?:app|beta|staging|develop)\\.element\\.io/" +
    ")(#.*)";

export const MATRIXTO_URL_PATTERN = "^(?:https?://)?(?:www\\.)?matrix\\.to/#/(([#@!+]).*)";
export const MATRIXTO_MD_LINK_PATTERN =
    '\\[([^\\]]*)\\]\\((?:https?://)?(?:www\\.)?matrix\\.to/#/([#@!+][^\\)]*)\\)';
export const MATRIXTO_BASE_URL= baseUrl;

export const options = {
    events: function(href: string, type: Type | string): Partial<GlobalEventHandlers> {
        switch (type) {
            case Type.URL: {
                // intercept local permalinks to users and show them like userids (in userinfo of current room)
                try {
                    const permalink = parsePermalink(href);
                    if (permalink && permalink.userId) {
                        return {
                            // @ts-ignore see https://linkify.js.org/docs/options.html
                            click: function(e) {
                                onUserClick(e, permalink.userId);
                            },
                        };
                    }
                } catch (e) {
                    // OK fine, it's not actually a permalink
                }
                break;
            }
            case Type.UserId:
                return {
                    // @ts-ignore see https://linkify.js.org/docs/options.html
                    click: function(e) {
                        onUserClick(e, href);
                    },
                };
            case Type.RoomAlias:
                return {
                    // @ts-ignore see https://linkify.js.org/docs/options.html
                    click: function(e) {
                        onAliasClick(e, href);
                    },
                };
            case Type.GroupId:
                return {
                    // @ts-ignore see https://linkify.js.org/docs/options.html
                    click: function(e) {
                        onGroupClick(e, href);
                    },
                };
        }
    },

    formatHref: function(href: string, type: Type | string): string {
        switch (type) {
            case Type.RoomAlias:
            case Type.UserId:
            case Type.GroupId:
            default: {
                return tryTransformEntityToPermalink(href);
            }
        }
    },

    linkAttributes: {
        rel: 'noreferrer noopener',
    },

    target: function(href: string, type: Type | string): string {
        if (type === Type.URL) {
            try {
                const transformed = tryTransformPermalinkToLocalHref(href);
                if (transformed !== href || decodeURIComponent(href).match(ELEMENT_URL_PATTERN)) {
                    return null;
                } else {
                    return '_blank';
                }
            } catch (e) {
                // malformed URI
            }
        }
        return null;
    },
};

// Run the plugins
// Linkify room aliases
parseFreeformMatrixLinks(linkifyjs, '#', Type.RoomAlias);
// Linkify group IDs
parseFreeformMatrixLinks(linkifyjs, '+', Type.GroupId);
// Linkify user IDs
parseFreeformMatrixLinks(linkifyjs, '@', Type.UserId);

export const linkify = linkifyjs;
export const _linkifyElement = linkifyElement;
export const _linkifyString = linkifyString;
