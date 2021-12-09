import * as languageHandler from '../../src/languageHandler';

const React = require('react');
const expect = require('expect');

const testUtils = require('../test-utils');

describe('languageHandler', function() {
    const selfClosingTagSub = 'Accept <policyLink /> to continue:';
    const textInTagSub = '<a>Upgrade</a> to your own domain';
    const plurals = 'and %(count)s others...';
    const variableSub = 'You are now ignoring %(userId)s';

    describe('when translations exist in language', () => {
        beforeEach(function(done) {
            testUtils.stubClient();

            languageHandler.setLanguage('en').then(done);
            languageHandler.setMissingEntryGenerator(key => key.split("|", 2)[1]);
        });

        it('translates a string to german', function(done) {
            languageHandler.setLanguage('de').then(function() {
                const translated = languageHandler._t('Rooms');
                expect(translated).toBe('Räume');
            }).then(done);
        });

        it('handles plurals', function() {
            const text = plurals;
            expect(languageHandler._t(text, { count: 1 })).toBe('and one other...');
            expect(languageHandler._t(text, { count: 2 })).toBe('and 2 others...');
        });

        it('handles simple variable subsitutions', function() {
            const text = 'You are now ignoring %(userId)s';
            expect(languageHandler._t(text, { userId: 'foo' })).toBe('You are now ignoring foo');
        });

        it('handles simple tag substitution', function() {
            const text = selfClosingTagSub;
            expect(languageHandler._t(text, {}, { 'policyLink': () => 'foo' }))
                .toBe('Accept foo to continue:');
        });

        it('handles text in tags', function() {
            const text = textInTagSub;
            expect(languageHandler._t(text, {}, { 'a': (sub) => `x${sub}x` }))
                .toBe('xUpgradex to your own domain');
        });

        it('variable substitution with React component', function() {
            const text = variableSub;
            expect(languageHandler._t(text, { userId: () => <i>foo</i> }))
                .toEqual((<span>You are now ignoring <i>foo</i></span>));
        });

        it('variable substitution with plain React component', function() {
            const text = variableSub;
            expect(languageHandler._t(text, { userId: <i>foo</i> }))
                .toEqual((<span>You are now ignoring <i>foo</i></span>));
        });

        it('tag substitution with React component', function() {
            const text = selfClosingTagSub;
            expect(languageHandler._t(text, {}, { 'policyLink': () => <i>foo</i> }))
                .toEqual(<span>Accept <i>foo</i> to continue:</span>);
        });

        it('replacements in the wrong order', function() {
            const text = '%(var1)s %(var2)s';
            expect(languageHandler._t(text, { var2: 'val2', var1: 'val1' })).toBe('val1 val2');
        });

        it('multiple replacements of the same variable', function() {
            const text = '%(var1)s %(var1)s';
            expect(languageHandler.substitute(text, { var1: 'val1' })).toBe('val1 val1');
        });

        it('multiple replacements of the same tag', function() {
            const text = '<a>Click here</a> to join the discussion! <a>or here</a>';
            expect(languageHandler.substitute(text, {}, { 'a': (sub) => `x${sub}x` }))
                .toBe('xClick herex to join the discussion! xor herex');
        });
    });

    describe('when a translation string does not exist in active language', () => {
        beforeEach(async () => {
            testUtils.stubClient();
            await languageHandler.setLanguage('lv');
            // counterpart doesnt expose any way to restore default config
            // missingEntryGenerator is mocked in the root setup file
            // reset to default here
            const counterpartDefaultMissingEntryGen = function(key) { return 'missing translation: ' + key; };
            languageHandler.setMissingEntryGenerator(counterpartDefaultMissingEntryGen);
        });

        it('marks basic fallback translations lang attribute', () => {
            const translated = languageHandler._t('Rooms');
            expect(translated).toEqual(<span lang="en">Rooms</span>);
        });

        it('handles plurals', function() {
            const text = plurals;
            expect(languageHandler._t(text, { count: 1 })).toEqual(<span lang="en">and one other...</span>);
            expect(languageHandler._t(text, { count: 2 })).toEqual(<span lang="en">and 2 others...</span>);
        });

        it('handles simple variable subsitutions', function() {
            const text = 'You are now ignoring %(userId)s';
            expect(languageHandler._t(text, { userId: 'foo' })).toEqual(
                <span lang="en">You are now ignoring foo</span>,
            );
        });

        it('handles simple tag substitution', function() {
            const text = selfClosingTagSub;
            expect(languageHandler._t(text, {}, { 'policyLink': () => 'foo' }))
                .toEqual(<span lang="en">Accept foo to continue:</span>);
        });

        it('handles text in tags', function() {
            const text = textInTagSub;
            expect(languageHandler._t(text, {}, { 'a': (sub) => `x${sub}x` }))
                .toEqual(<span lang="en">xUpgradex to your own domain</span>);
        });

        it('variable substitution with React component', function() {
            const text = variableSub;
            expect(languageHandler._t(text, { userId: () => <i>foo</i> }))
                .toEqual((<span lang="en"><span>You are now ignoring <i>foo</i></span></span>));
        });

        it('variable substitution with plain React component', function() {
            const text = variableSub;
            expect(languageHandler._t(text, { userId: <i>foo</i> }))
                .toEqual((<span lang="en"><span>You are now ignoring <i>foo</i></span></span>));
        });

        it('tag substitution with React component', function() {
            const text = selfClosingTagSub;
            expect(languageHandler._t(text, {}, { 'policyLink': () => <i>foo</i> }))
                .toEqual(<span lang="en"><span>Accept <i>foo</i> to continue:</span></span>);
        });
    });
});
