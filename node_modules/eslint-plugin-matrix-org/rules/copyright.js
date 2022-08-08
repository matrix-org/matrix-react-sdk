/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

module.exports = {
    meta: {
        fixable: "code",
        schema: [
            { type: "string" }
        ]
    },
    create: function (context) {
        const code = context.getSourceCode();
        return {
            Program(node) {
                const firstToken = code.getFirstToken(node, { includeComments: false });

                if (!firstToken) {
                    return;
                }

                const headComments = code.getCommentsBefore(firstToken);
                const hasSomeCopyrightHeader = headComments?.some(comment => comment?.value?.includes('Copyright'));
                if (hasSomeCopyrightHeader) {
                    return;
                }
                const headerTemplate = context.options[0];
                const fix = headerTemplate ? function (fixer) {
                    return fixer.insertTextBefore(firstToken, headerTemplate.replace(/%%CURRENT_YEAR%%/g, new Date().getFullYear()))
                } : undefined;

                context.report({
                    node,
                    message: 'Copyright heading is required',
                    fix
                });
            },
        };
    },
}
