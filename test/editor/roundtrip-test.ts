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

import { MatrixEvent } from 'matrix-js-sdk/src/matrix';

import { parseEvent } from "../../src/editor/deserialize";
import EditorModel from '../../src/editor/model';
import DocumentOffset from '../../src/editor/offset';
import {htmlSerializeIfNeeded, textSerialize} from '../../src/editor/serialize';
import { createPartCreator } from "./mock";

function htmlMessage(formattedBody: string, msgtype = "m.text") {
    return {
        getContent() {
            return {
                msgtype,
                format: "org.matrix.custom.html",
                formatted_body: formattedBody,
            };
        },
    } as unknown as MatrixEvent;
}

async function md2html(markdown: string): Promise<string> {
    const pc = createPartCreator();
    const oldModel = new EditorModel([], pc, () => {});
    await oldModel.update(
        markdown,
        "insertText",
        new DocumentOffset(markdown.length, false),
    );
    return htmlSerializeIfNeeded(oldModel, { forceHTML: true });
}

function html2md(html: string): string {
    const pc = createPartCreator();
    let parts = parseEvent(htmlMessage(html), pc);
    const newModel = new EditorModel(parts, pc);
    return textSerialize(newModel);
}

async function roundTripMarkdown(markdown: string): Promise<string> {
    return html2md(await md2html(markdown));
}

async function roundTripHtml(html: string): Promise<string> {
    return await md2html(html2md(html));
}


describe('editor/roundtrip', function() {
    describe('markdown messages should round-trip if they contain', function() {
        it('newlines', async function() {
            const markdown = "hello\nworld";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it.skip('newlines with trailing and leading whitespace', async function() {
            const markdown = "hello \n world";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('pills', async function() {
            const markdown = "text message for @room";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('pills with interesting characters in mxid', async function() {
            const markdown = "text message for @alice\\\\\\_\\]#>&:hs.example.com";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('styling', async function() {
            const markdown = "**bold** and _emphasised_";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('styling, but * becomes _', async function() {
            expect(await roundTripMarkdown("**bold** and *emphasised*"))
                .toEqual("**bold** and _emphasised_");
        });
        it('bold within a word', async function() {
            const markdown = "abso**fragging**lutely";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Escapes the underscores
        it.skip('underscores within a word', async function() {
            const markdown = "abso_fragging_lutely";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('links', async function() {
            const markdown = "click [this](http://example.com/)!";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('quotations', async function() {
            const markdown = "saying\n\n> NO\n\nis valid";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Includes the trailing text into the quotation
        // https://github.com/vector-im/element-web/issues/22341
        it.skip('quotations without separating newlines', async function() {
            const markdown = "saying\n> NO\nis valid";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('nested quotations', async function() {
            const markdown = "saying\n\n> > foo\n\n> NO\n\nis valid";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Removes trailing and leading whitespace
        it.skip('quotations with trailing and leading whitespace', async function() {
            const markdown = "saying \n\n> NO\n\n is valid";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('inline code', async function() {
            const markdown = "there's no place `127.0.0.1` like";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('just a code block', async function() {
            const markdown = "```\nfoo(bar).baz();\n\n3\n```";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Removes trailing spaces
        it.skip('a code block followed by newlines', async function() {
            const markdown = "```\nfoo(bar).baz();\n\n3\n```\n\n";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds a space after the code block
        it.skip('a code block surrounded by text', async function() {
            const markdown = "```A\nfoo(bar).baz();\n\n3\n```\nB";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('a code block followed by text after a blank line', async function() {
            const markdown = "```A\nfoo(bar).baz();\n\n3\n```\n\nB";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('an unordered list', async function() {
            const markdown = "A\n\n- b\n- c\n- d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds a space before the list
        it.skip('an unordered list directly preceded by text', async function() {
            const markdown = "A\n- b\n- c\n- d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('an ordered list', async function() {
            const markdown = "A\n\n1. b\n2. c\n3. d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds a space before the list
        it.skip('an ordered list directly preceded by text', async function() {
            const markdown = "A\n1. b\n2. c\n3. d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds and removes spaces before the nested list
        it.skip('nested unordered lists', async function() {
            const markdown = "A\n- b\n- c\n    - c1\n    - c2\n- d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds and removes spaces before the nested list
        it.skip('nested ordered lists', async function() {
            const markdown = "A\n\n1. b\n2. c\n    1. c1\n    2. c2\n3. d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Adds and removes spaces before the nested list
        it.skip('nested mixed lists', async function() {
            const markdown = "A\n\n1. b\n2. c\n    - c1\n    - c2\n3. d\nE";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('nested formatting', async function() {
            const markdown = "a<del>b **c _d_ e** f</del>g";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('code blocks containing backticks', async function() {
            const markdown = "```\nfoo ->`x`\nbar\n```";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('code in backticks', async function() {
            const markdown = "foo ->`x`";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('escaped backslashes', async function() {
            const markdown = "C:\\\\Program Files";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        // Backslashes get doubled
        it.skip('backslashes', async function() {
            const markdown = "C:\\Program Files";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('escaped markdown', async function() {
            const markdown = "\\*\\*foo\\*\\* \\_bar\\_ \\[a\\](b)";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
        it('escaped html', async function() {
            const markdown = "a\\<foo>b";
            expect(await roundTripMarkdown(markdown)).toEqual(markdown);
        });
    });
    describe('HTML messages should round-trip if they contain', function() {
        it('line breaks', async function() {
            const html = "one<br>two";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('formatting', async function() {
            const html = "This <em>is</em> im<strong>port</strong>ant";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('formatting within a word', async function() {
            const html = "abso<strong>fragging</strong>lutely";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        // Strips out the pill - maybe needs some user lookup to work?
        it.skip('user pills', async function() {
            const html = '<a href="https://matrix.to/#/@alice:hs.tld">Alice</a>';
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('markdown-like symbols', async function() {
            const html = "You _would_ **type** [a](http://this.example.com) this.";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('escaped html', async function() {
            const html = "This &gt;em&lt;isn't&gt;em&lt; important";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('links', async function() {
            const html = 'Go <a href="http://more.example.com/">here</a> to see more';
            expect(await roundTripHtml(html)).toEqual(html);
        });
        // Appends a slash to the URL
        // https://github.com/vector-im/element-web/issues/22342
        it.skip('links without trailing slashes', async function() {
            const html = 'Go <a href="http://more.example.com">here</a> to see more';
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('paragraphs', async function() {
            const html = "<p>one</p>\n<p>two</p>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        // Inserts newlines after tags
        it.skip('paragraphs without newlines', async function() {
            const html = "<p>one</p><p>two</p>";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('paragraphs including formatting', async function() {
            const html = "<p>one</p>\n<p>t <em>w</em> o</p>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('code blocks', async function() {
            const html = "<pre><code>a\ny;\n</code></pre>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('code blocks with surrounding text', async function() {
            const html = "<p>a</p>\n<pre><code>a\ny;\n</code></pre>\n<p>b</p>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('unordered lists', async function() {
            const html = "<ul>\n<li>asd</li>\n<li>fgd</li>\n</ul>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('ordered lists', async function() {
            const html = "<ol>\n<li>asd</li>\n<li>fgd</li>\n</ol>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        // Inserts a code block
        it.skip('nested lists', async function() {
            const html = "<ol>\n<li>asd</li>\n<li>\n<ul>\n<li>fgd</li>\n<li>sdf</li>\n</ul>\n</li>\n</ol>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('nested blockquotes', async function() {
            const html = "<blockquote>\n<p>foo</p>\n<blockquote>\n<p>bar</p>\n</blockquote>\n</blockquote>\n";
            expect(await roundTripHtml(html)).toEqual(html);
        });
        it('backslashes', async function() {
            const html = "C:\\Program Files";
            expect(await roundTripHtml(html)).toEqual(html);
        });
    });
});
