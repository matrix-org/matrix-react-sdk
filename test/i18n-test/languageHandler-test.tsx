import React from 'react';

import {
    _t,
    _tDom,
    TranslatedString,
    setLanguage,
    setMissingEntryGenerator,
    substitute,
} from '../../src/languageHandler';
import { stubClient } from '../test-utils';

describe('languageHandler', function() {
    const basicString = 'Rooms';
    const selfClosingTagSub = 'Accept <policyLink /> to continue:';
    const textInTagSub = '<a>Upgrade</a> to your own domain';
    const plurals = 'and %(count)s others...';
    const variableSub = 'You are now ignoring %(userId)s';

    type TestCase = [string, string, Record<string, unknown>, Record<string, unknown>, TranslatedString];
    const testCasesEn: TestCase[] = [
        ['translates a basic string', basicString, {}, undefined, 'Rooms'],
        [
            'handles plurals when count is 0',
            plurals,
            { count: 0 },
            undefined,
            'and 0 others...',
        ],
        [
            'handles plurals when count is 1',
            plurals,
            { count: 1 },
            undefined,
            'and one other...',
        ],
        [
            'handles plurals when count is not 1',
            plurals,
            { count: 2 },
            undefined,
            'and 2 others...',
        ],
        [
            'handles simple variable substitution',
            variableSub,
            { userId: 'foo' },
            undefined,
            'You are now ignoring foo',
        ],
        [
            'handles simple tag substitution',
            selfClosingTagSub,
            {},
            { 'policyLink': () => 'foo' },
            'Accept foo to continue:',
        ],
        ['handles text in tags', textInTagSub, {}, { 'a': (sub) => `x${sub}x` }, 'xUpgradex to your own domain'],
        [
            'handles variable substitution with React function component',
            variableSub,
            { userId: () => <i>foo</i> },
            undefined,
            // eslint-disable-next-line react/jsx-key
            <span>You are now ignoring <i>foo</i></span>,
        ],
        [
            'handles variable substitution with react node',
            variableSub,
            { userId: <i>foo</i> },
            undefined,
            // eslint-disable-next-line react/jsx-key
            <span>You are now ignoring <i>foo</i></span>,
        ],
        [
            'handles tag substitution with React function component',
            selfClosingTagSub,
            {},
            { 'policyLink': () => <i>foo</i> },
            // eslint-disable-next-line react/jsx-key
            <span>Accept <i>foo</i> to continue:</span>,
        ],
    ];

    describe('when translations exist in language', () => {
        beforeEach(function(done) {
            stubClient();

            setLanguage('en').then(done);
            setMissingEntryGenerator(key => key.split("|", 2)[1]);
        });

        it('translates a string to german', function(done) {
            setLanguage('de').then(function() {
                const translated = _t(basicString);
                expect(translated).toBe('Räume');
            }).then(done);
        });

        it.each(testCasesEn)("%s", async (_d, translationString, variables, tags, result) => {
            expect(_t(translationString, variables, tags)).toEqual(result);
        });

        it('replacements in the wrong order', function() {
            const text = '%(var1)s %(var2)s';
            expect(_t(text, { var2: 'val2', var1: 'val1' })).toBe('val1 val2');
        });

        it('multiple replacements of the same variable', function() {
            const text = '%(var1)s %(var1)s';
            expect(substitute(text, { var1: 'val1' })).toBe('val1 val1');
        });

        it('multiple replacements of the same tag', function() {
            const text = '<a>Click here</a> to join the discussion! <a>or here</a>';
            expect(substitute(text, {}, { 'a': (sub) => `x${sub}x` }))
                .toBe('xClick herex to join the discussion! xor herex');
        });
    });

    describe('when a translation string does not exist in active language', () => {
        beforeEach(async () => {
            stubClient();
            await setLanguage('lv');
            // counterpart doesnt expose any way to restore default config
            // missingEntryGenerator is mocked in the root setup file
            // reset to default here
            const counterpartDefaultMissingEntryGen =
                function(key) { return 'missing translation: ' + key; };
            setMissingEntryGenerator(counterpartDefaultMissingEntryGen);
        });

        const lvExistingPlural = 'Uploading %(filename)s and %(count)s others';

        // lv does not have a pluralizer function
        const noPluralizerCase = [
            'handles plural strings when no pluralizer exists for language',
            lvExistingPlural,
            { count: 1, filename: 'test.txt' },
            undefined,
            'Uploading test.txt and 1 other',
        ] as TestCase;

        describe('_t', () => {
            it.each([...testCasesEn, noPluralizerCase])(
                "%s and translates with fallback locale",
                async (_d, translationString, variables, tags, result) => {
                    expect(_t(translationString, variables, tags)).toEqual(result);
                },
            );
        });

        describe('_tDom()', () => {
            it.each([...testCasesEn, noPluralizerCase])(
                "%s and translates with fallback locale, attributes fallback locale",
                async (_d, translationString, variables, tags, result) => {
                    expect(_tDom(translationString, variables, tags)).toEqual(<span lang="en">{ result }</span>);
                },
            );
        });
    });
});
