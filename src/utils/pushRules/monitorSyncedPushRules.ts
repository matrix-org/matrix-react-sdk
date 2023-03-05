/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixEvent, EventType } from "matrix-js-sdk/src/matrix";
import { PushProcessor } from "matrix-js-sdk/src/pushprocessor";
import { RuleId, IAnnotatedPushRule } from "matrix-js-sdk/src/@types/PushRules";
import { logger } from "matrix-js-sdk/src/logger";

import { VectorPushRulesDefinitions, VectorPushRuleDefinition } from "../../notifications";
import { updateExistingPushRulesWithActions } from "./updatePushRuleActions";

const pushRuleAndKindToAnnotated = (
    ruleAndKind: ReturnType<PushProcessor["getPushRuleAndKindById"]>,
): IAnnotatedPushRule | undefined =>
    ruleAndKind
        ? {
              ...ruleAndKind.rule,
              kind: ruleAndKind.kind,
          }
        : undefined;

const monitorSyncedRule = async (
    matrixClient: MatrixClient,
    pushProcessor: PushProcessor,
    ruleId: RuleId | string,
    definition: VectorPushRuleDefinition,
): Promise<void> => {
    const primaryRule = pushRuleAndKindToAnnotated(pushProcessor.getPushRuleAndKindById(ruleId));

    if (!primaryRule) {
        return;
    }
    const syncedRules: IAnnotatedPushRule[] = definition.syncedRuleIds
        ?.map((ruleId) => pushRuleAndKindToAnnotated(pushProcessor.getPushRuleAndKindById(ruleId)))
        .filter(Boolean);

    // no synced rules to manage
    if (!syncedRules?.length) {
        return;
    }

    const primaryRuleVectorState = definition.ruleToVectorState(primaryRule);

    const outOfSyncRules = syncedRules.filter(
        (syncedRule) => definition.ruleToVectorState(syncedRule) !== primaryRuleVectorState,
    );

    if (outOfSyncRules.length) {
        await updateExistingPushRulesWithActions(
            matrixClient,
            // eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
            outOfSyncRules.map(({ rule_id }) => rule_id),
            primaryRule.actions,
        );
    }
};

export const monitorSyncedPushRules = async (
    accountDataEvent: MatrixEvent,
    matrixClient: MatrixClient,
): Promise<void> => {
    if (accountDataEvent?.getType() !== EventType.PushRules) {
        return;
    }
    const pushProcessor = new PushProcessor(matrixClient);

    Object.entries(VectorPushRulesDefinitions).map(([ruleId, definition]) => {
        try {
            monitorSyncedRule(matrixClient, pushProcessor, ruleId, definition);
        } catch (error) {
            logger.error(`Failed to fully synchronise push rules for ${ruleId}`, error);
        }
    });
};
