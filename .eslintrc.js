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

const fs = require("fs");

/** Maximum supported ECMAScript version. */
const ecmaVersion = 2021;

/**
 * Generates configs to restrict the code to a specific ECMAScript version.
 *
 * @param {number} maxECMAScriptVersion - maximum supported ECMAScript version
 * @returns {string[]} list of ESLint configs to be used with an "extends" property
 */
const determineEsXNoNewInConfigs = (maxECMAScriptVersion) => {
    // esnext is always unsupported
    const esXNoNewIn = ["plugin:es-x/no-new-in-esnext", "plugin:es-x/no-new-in-esnext-intl-api"];
    let esXNoNewInYear = maxECMAScriptVersion;
    let esXYearConfigExists = false;

    do {
        esXNoNewInYear++;

        esXYearConfigExists =
            fs.existsSync(`./node_modules/eslint-plugin-es-x/lib/configs/no-new-in-es${esXNoNewInYear}.js`) &&
            fs.existsSync(`./node_modules/eslint-plugin-es-x/lib/configs/no-new-in-es${esXNoNewInYear}-intl-api.js`);

        if (esXYearConfigExists) {
            esXNoNewIn.push(
                `plugin:es-x/no-new-in-es${esXNoNewInYear}`,
                `plugin:es-x/no-new-in-es${esXNoNewInYear}-intl-api`,
            );
        }
    } while (esXYearConfigExists);

    return esXNoNewIn;
};

module.exports = {
    plugins: ["matrix-org", "es-x"],
    extends: ["plugin:matrix-org/babel", "plugin:matrix-org/react", "plugin:matrix-org/a11y"],
    parserOptions: {
        project: ["./tsconfig.json"],
        ecmaVersion,
    },
    env: {
        browser: true,
        node: true,
    },
    globals: {
        LANGUAGES_FILE: "readonly",
    },
    rules: {
        // Things we do that break the ideal style
        "no-constant-condition": "off",
        "prefer-promise-reject-errors": "off",
        "no-async-promise-executor": "off",
        "no-extra-boolean-cast": "off",

        // Bind or arrow functions in props causes performance issues (but we
        // currently use them in some places).
        // It's disabled here, but we should using it sparingly.
        "react/jsx-no-bind": "off",
        "react/jsx-key": ["error"],

        "no-restricted-properties": [
            "error",
            ...buildRestrictedPropertiesOptions(
                ["window.innerHeight", "window.innerWidth", "window.visualViewport"],
                "Use UIStore to access window dimensions instead.",
            ),
            ...buildRestrictedPropertiesOptions(
                ["*.mxcUrlToHttp", "*.getHttpUriForMxc"],
                "Use Media helper instead to centralise access for customisation.",
            ),
        ],

        // Ban matrix-js-sdk/src imports in favour of matrix-js-sdk/src/matrix imports to prevent unleashing hell.
        "no-restricted-imports": [
            "error",
            {
                paths: [
                    {
                        name: "matrix-js-sdk",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src/",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src/index",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-react-sdk",
                        message: "Please use matrix-react-sdk/src/index instead",
                    },
                    {
                        name: "matrix-react-sdk/",
                        message: "Please use matrix-react-sdk/src/index instead",
                    },
                ],
                patterns: [
                    {
                        group: ["matrix-js-sdk/lib", "matrix-js-sdk/lib/", "matrix-js-sdk/lib/**"],
                        message: "Please use matrix-js-sdk/src/* instead",
                    },
                ],
            },
        ],

        // There are too many a11y violations to fix at once
        // Turn violated rules off until they are fixed
        "jsx-a11y/aria-activedescendant-has-tabindex": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "jsx-a11y/media-has-caption": "off",
        "jsx-a11y/mouse-events-have-key-events": "off",
        "jsx-a11y/no-autofocus": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
        "jsx-a11y/no-noninteractive-tabindex": "off",
        "jsx-a11y/no-static-element-interactions": "off",
        "jsx-a11y/role-supports-aria-props": "off",
        "jsx-a11y/tabindex-no-positive": "off",

        "matrix-org/require-copyright-header": "error",
    },
    overrides: [
        {
            files: ["src/**/*.{ts,tsx}"],
            extends: determineEsXNoNewInConfigs(ecmaVersion),
            rules: {
                "es-x/no-class-fields": "off",
            },
        },
        {
            files: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}", "cypress/**/*.ts"],
            extends: ["plugin:matrix-org/typescript", "plugin:matrix-org/react"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": [
                    "error",
                    {
                        allowExpressions: true,
                    },
                ],

                // Things we do that break the ideal style
                "prefer-promise-reject-errors": "off",
                "no-extra-boolean-cast": "off",

                // Remove Babel things manually due to override limitations
                "@babel/no-invalid-this": ["off"],

                // We're okay being explicit at the moment
                "@typescript-eslint/no-empty-interface": "off",
                // We disable this while we're transitioning
                "@typescript-eslint/no-explicit-any": "off",
                // We'd rather not do this but we do
                "@typescript-eslint/ban-ts-comment": "off",
                // We're okay with assertion errors when we ask for them
                "@typescript-eslint/no-non-null-assertion": "off",
            },
        },
        // temporary override for offending icon require files
        {
            files: [
                "src/SdkConfig.ts",
                "src/components/structures/FileDropTarget.tsx",
                "src/components/structures/RoomStatusBar.tsx",
                "src/components/structures/UserMenu.tsx",
                "src/components/views/avatars/WidgetAvatar.tsx",
                "src/components/views/dialogs/AddExistingToSpaceDialog.tsx",
                "src/components/views/dialogs/ForwardDialog.tsx",
                "src/components/views/dialogs/InviteDialog.tsx",
                "src/components/views/dialogs/ModalWidgetDialog.tsx",
                "src/components/views/dialogs/UploadConfirmDialog.tsx",
                "src/components/views/dialogs/security/SetupEncryptionDialog.tsx",
                "src/components/views/elements/AddressTile.tsx",
                "src/components/views/elements/AppWarning.tsx",
                "src/components/views/elements/SSOButtons.tsx",
                "src/components/views/messages/MAudioBody.tsx",
                "src/components/views/messages/MImageBody.tsx",
                "src/components/views/messages/MFileBody.tsx",
                "src/components/views/messages/MStickerBody.tsx",
                "src/components/views/messages/MVideoBody.tsx",
                "src/components/views/messages/MVoiceMessageBody.tsx",
                "src/components/views/right_panel/EncryptionPanel.tsx",
                "src/components/views/rooms/EntityTile.tsx",
                "src/components/views/rooms/LinkPreviewGroup.tsx",
                "src/components/views/rooms/MemberList.tsx",
                "src/components/views/rooms/MessageComposer.tsx",
                "src/components/views/rooms/ReplyPreview.tsx",
                "src/components/views/settings/tabs/room/SecurityRoomSettingsTab.tsx",
                "src/components/views/settings/tabs/user/GeneralUserSettingsTab.tsx",
            ],
            rules: {
                "@typescript-eslint/no-var-requires": "off",
            },
        },
        {
            files: ["test/**/*.{ts,tsx}", "cypress/**/*.ts"],
            extends: ["plugin:matrix-org/jest"],
            rules: {
                // We don't need super strict typing in test utilities
                "@typescript-eslint/explicit-function-return-type": "off",
                "@typescript-eslint/explicit-member-accessibility": "off",

                // Jest/Cypress specific

                // Disabled tests are a reality for now but as soon as all of the xits are
                // eliminated, we should enforce this.
                "jest/no-disabled-tests": "off",
                // TODO: There are many tests with invalid expects that should be fixed,
                // https://github.com/vector-im/element-web/issues/24709
                "jest/valid-expect": "off",
                // Also treat "oldBackendOnly" as a test function.
                // Used in some crypto tests.
                "jest/no-standalone-expect": [
                    "error",
                    {
                        additionalTestBlockFunctions: ["beforeAll", "beforeEach", "oldBackendOnly"],
                    },
                ],
            },
        },
        {
            files: ["cypress/**/*.ts"],
            parserOptions: {
                project: ["./cypress/tsconfig.json"],
            },
            rules: {
                // Cypress "promises" work differently - disable some related rules
                "jest/valid-expect-in-promise": "off",
                "jest/no-done-callback": "off",
            },
        },
    ],
    settings: {
        react: {
            version: "detect",
        },
    },
};

function buildRestrictedPropertiesOptions(properties, message) {
    return properties.map((prop) => {
        let [object, property] = prop.split(".");
        if (object === "*") {
            object = undefined;
        }
        return {
            object,
            property,
            message,
        };
    });
}
