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
import { registerPlugin } from 'linkifyjs';
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

// Linkify stuff doesn't type scanner/parser/utils properly :/
function matrixOpaqueIdLinkifyParser({
    scanner,
    parser,
    utils,
    token,
    name,
}: {
    scanner: any;
    parser: any;
    utils: any;
    token: '#' | '+';
    name: Type;
}) {
    const {
        DOMAIN,
        DOT,
        // A generic catchall text token
        TEXT,
        NUM,
        TLD,
        COLON,
        SYM,
        UNDERSCORE,
        // because 'localhost' is tokenised to the localhost token,
        // usernames @localhost:foo.com are otherwise not matched!
        LOCALHOST,
    } = scanner.tokens;

    const S_START = parser.start;
    const Localpart = utils.createTokenClass(name, { isLink: true });

    const localpartTokens = [
        DOMAIN,
        NUM,
        TLD,

        // because 'localhost' is tokenised to the localhost token,
        // usernames @localhost:foo.com are otherwise not matched!
        LOCALHOST,
        SYM,
        UNDERSCORE,
        TEXT,
    ];

    const HASH_STATE = S_START.tt(token);
    const LOCALPART_STATE = HASH_STATE.tt(DOMAIN, Localpart);

    for (const token of localpartTokens) {
        HASH_STATE.tt(token, LOCALPART_STATE);
        LOCALPART_STATE.tt(token, LOCALPART_STATE);
    }

    const TLD_STATE = LOCALPART_STATE.tt(TLD);
    TLD_STATE.tt(DOMAIN, LOCALPART_STATE);
    TLD_STATE.tt(TLD, LOCALPART_STATE);

    const DOT_STATE = LOCALPART_STATE.tt(DOT, TLD_STATE);

    const COLON_STATE = LOCALPART_STATE.tt(COLON);

    COLON_STATE.tt(LOCALHOST, LOCALPART_STATE);
    COLON_STATE.tt(TLD, LOCALPART_STATE);
    COLON_STATE.tt(DOMAIN, LOCALPART_STATE);

    LOCALPART_STATE.tt(COLON, COLON_STATE);
    LOCALPART_STATE.tt(DOT, DOT_STATE); // accept repeated TLDs (e.g .org.uk)
    const PORT_STATE = LOCALPART_STATE.tt(COLON);
    PORT_STATE.tt(NUM, LOCALPART_STATE);
}

function matrixUserIdLinkifyPlugin({ scanner, parser, utils }) {
    const {
        AT,
        DOMAIN,
        DOT,
        UNDERSCORE,
        EQUALS,
        MINUS,
        SLASH,
        NUM,
        TLD,
        COLON,
        // because 'localhost' is tokenised to the localhost token,
        // usernames @localhost:foo.com are otherwise not matched!
        LOCALHOST,
    } = scanner.tokens;

    const S_START = parser.start;
    const UserId = utils.createTokenClass(Type.UserId, { isLink: true });

    // Slightly more defined tokens list than for OpaqueID
    const localpartTokens = [
        DOMAIN,
        NUM,
        TLD,
        NUM,
        DOT,
        UNDERSCORE,
        EQUALS,
        MINUS,
        SLASH,

        // because 'localhost' is tokenised to the localhost token,
        // usernames @localhost:foo.com are otherwise not matched!
        LOCALHOST,
    ];

    const HASH_STATE = S_START.tt(AT);
    const LOCALPART_STATE = HASH_STATE.tt(DOMAIN, UserId);

    for (const token of localpartTokens) {
        HASH_STATE.tt(token, LOCALPART_STATE);
        LOCALPART_STATE.tt(token, LOCALPART_STATE);
    }

    const TLD_STATE = LOCALPART_STATE.tt(TLD);
    TLD_STATE.tt(DOMAIN, LOCALPART_STATE);
    TLD_STATE.tt(TLD, LOCALPART_STATE);

    const DOT_STATE = LOCALPART_STATE.tt(DOT, TLD_STATE);

    const COLON_STATE = LOCALPART_STATE.tt(COLON);

    COLON_STATE.tt(LOCALHOST, LOCALPART_STATE);
    COLON_STATE.tt(TLD, LOCALPART_STATE);
    COLON_STATE.tt(DOMAIN, LOCALPART_STATE);

    LOCALPART_STATE.tt(COLON, COLON_STATE);
    LOCALPART_STATE.tt(DOT, DOT_STATE); // accept repeated TLDs (e.g .org.uk)
    const PORT_STATE = LOCALPART_STATE.tt(COLON);
    PORT_STATE.tt(NUM, LOCALPART_STATE);
}

export const matrixLinkify: Record<any, any> = {
    // stubs, overwritten in MatrixChat's componentDidMount
    onUserClick: function(e: MouseEvent, userId: string) {
        const member = new RoomMember(null, userId);
        if (!member) { return; }
        dis.dispatch<ViewUserPayload>({
            action: Action.ViewUser,
            member: member,
        });
    },
    onAliasClick: function(e: MouseEvent, roomAlias: string) {
        event.preventDefault();
        dis.dispatch({ action: 'view_room', room_alias: roomAlias });
    },
    onGroupClick: function(e: MouseEvent, groupId: string) {
        event.preventDefault();
        dis.dispatch({ action: 'view_group', group_id: groupId });
    },
};

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
                                matrixLinkify.onUserClick(e, permalink.userId);
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
                        matrixLinkify.onUserClick(e, href);
                    },
                };
            case Type.RoomAlias:
                return {
                    // @ts-ignore see https://linkify.js.org/docs/options.html
                    click: function(e) {
                        matrixLinkify.onAliasClick(e, href);
                    },
                };
            case Type.GroupId:
                return {
                    // @ts-ignore see https://linkify.js.org/docs/options.html
                    click: function(e) {
                        matrixLinkify.onGroupClick(e, href);
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
                if (transformed !== href || decodeURIComponent(href).match(matrixLinkify.ELEMENT_URL_PATTERN)) {
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

registerPlugin(Type.RoomAlias, ({ scanner, parser, utils }) => {
    const token = scanner.tokens.POUND as '#';
    return matrixOpaqueIdLinkifyParser({
        scanner,
        parser,
        utils,
        token,
        name: Type.RoomAlias,
    });
});
registerPlugin(Type.GroupId, ({ scanner, parser, utils }) => {
    const token = scanner.tokens.PLUS as '+';
    return matrixOpaqueIdLinkifyParser({
        scanner,
        parser,
        utils,
        token,
        name: Type.GroupId,
    });
});
registerPlugin(Type.UserId, matrixUserIdLinkifyPlugin);
export const linkify = linkifyjs;
