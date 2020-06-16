/*
Copyright 2016 OpenMarket Ltd
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

'use strict';

import {MatrixClientPeg} from "../MatrixClientPeg";
import {NotificationUtils} from "./NotificationUtils";

export * from "./NotificationUtils";
export * from "./PushRuleVectorState";
export * from "./VectorPushRulesDefinitions";
export * from "./ContentRules";

/**
 * Rules that Vector used to set in order to override the actions of default rules.
 * These are used to port peoples existing overrides to match the current API.
 * These can be removed and forgotten once everyone has moved to the new client.
 */
const LEGACY_RULES = {
    "im.vector.rule.contains_display_name": ".m.rule.contains_display_name",
    "im.vector.rule.room_one_to_one": ".m.rule.room_one_to_one",
    "im.vector.rule.room_message": ".m.rule.message",
    "im.vector.rule.invite_for_me": ".m.rule.invite_for_me",
    "im.vector.rule.call": ".m.rule.call",
    "im.vector.rule.notices": ".m.rule.suppress_notices",
};

function portLegacyActions(actions) {
    const decoded = NotificationUtils.decodeActions(actions);
    if (decoded !== null) {
        return NotificationUtils.encodeActions(decoded);
    } else {
        // We don't recognise one of the actions here, so we don't try to
        // canonicalise them.
        return actions;
    }
}

// Check if any legacy im.vector rules need to be ported to the new API
// for overriding the actions of default rules.
export function portRulesToNewAPI(rulesets) {
    const needsUpdate = [];
    const cli = MatrixClientPeg.get();

    for (const kind in rulesets.global) {
        const ruleset = rulesets.global[kind];
        for (let i = 0; i < ruleset.length; ++i) {
            const rule = ruleset[i];
            if (rule.rule_id in LEGACY_RULES) {
                console.log("Porting legacy rule", rule);
                needsUpdate.push( function(kind, rule) {
                    return cli.setPushRuleActions(
                        'global', kind, LEGACY_RULES[rule.rule_id], portLegacyActions(rule.actions),
                    ).then(() =>
                        cli.deletePushRule('global', kind, rule.rule_id),
                    ).catch( (e) => {
                        console.warn(`Error when porting legacy rule: ${e}`);
                    });
                }(kind, rule));
            }
        }
    }

    if (needsUpdate.length > 0) {
        // If some of the rules need to be ported then wait for the porting
        // to happen and then fetch the rules again.
        return Promise.all(needsUpdate).then(() =>
            cli.getPushRules(),
        );
    } else {
        // Otherwise return the rules that we already have.
        return rulesets;
    }
}
