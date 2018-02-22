const React = require('react');
const expect = require('expect');
import * as languageHandler from '../../src/languageHandler';

const testUtils = require('../test-utils');

describe('languageHandler', function() {
    let sandbox;

    beforeEach(function(done) {
        testUtils.beforeEach(this);
        sandbox = testUtils.stubClient();

        languageHandler.setLanguage('en').done(done);
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('translates a string to german', function() {
        languageHandler.setLanguage('de').then(function() {
            const translated = languageHandler._t('Rooms');
            expect(translated).toBe('Räume');
        });
    });

    it('handles plurals', function() {
        const text = 'and %(count)s others...';
        expect(languageHandler._t(text, { count: 1 })).toBe('and one other...');
        expect(languageHandler._t(text, { count: 2 })).toBe('and 2 others...');
    });

    it('handles simple variable subsitutions', function() {
        const text = 'You are now ignoring %(userId)s';
        expect(languageHandler._t(text, { userId: 'foo' })).toBe('You are now ignoring foo');
    });

    it('handles simple tag substitution', function() {
        const text = 'Press <StartChatButton> to start a chat with someone';
        expect(languageHandler._t(text, {}, { 'StartChatButton': () => 'foo' }))
            .toBe('Press foo to start a chat with someone');
    });

    it('handles text in tags', function() {
        const text = '<a>Click here</a> to join the discussion!';
        expect(languageHandler._t(text, {}, { 'a': (sub) => `x${sub}x` }))
            .toBe('xClick herex to join the discussion!');
    });

    it('variable substitution with React component', function() {
        const text = 'You are now ignoring %(userId)s';
        expect(languageHandler._t(text, { userId: () => <i>foo</i> }))
            .toEqual((<span>You are now ignoring <i>foo</i></span>));
    });

    it('variable substitution with plain React component', function() {
        const text = 'You are now ignoring %(userId)s';
        expect(languageHandler._t(text, { userId: <i>foo</i> }))
            .toEqual((<span>You are now ignoring <i>foo</i></span>));
    });

    it('tag substitution with React component', function() {
        const text = 'Press <StartChatButton> to start a chat with someone';
        expect(languageHandler._t(text, {}, { 'StartChatButton': () => <i>foo</i> }))
            .toEqual(<span>Press <i>foo</i> to start a chat with someone</span>);
    });

    it('replacements in the wrong order', function() {
        const text = '%(var1)s %(var2)s';
        expect(languageHandler._t(text, { var2: 'val2', var1: 'val1' })).toBe('val1 val2');
    });
});
