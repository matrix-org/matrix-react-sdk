/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import customCSS from "!!raw-loader!./exportCustomCSS.css";

function mutateCssText(css: string): string {
    // replace used fonts so that we don't have to bundle Inter & Inconsalata
    const sansFont = `-apple-system, BlinkMacSystemFont, avenir next,
            avenir, segoe ui, helvetica neue, helvetica, Ubuntu, roboto, noto, arial, sans-serif`;
    return css
        .replace(/font-family: ?(Inter|'Inter'|"Inter")/g, `font-family: ${sansFont}`)
        .replace(/--cpd-font-family-sans: ?(Inter|'Inter'|"Inter")/g, `--cpd-font-family-sans: ${sansFont}`)
        .replace(
            /font-family: ?Inconsolata/g,
            "font-family: Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace",
        );
}

// naively culls unused css rules based on which classes are present in the html,
// doesn't cull rules which won't apply due to the full selector not matching but gets rid of a LOT of cruft anyway.
// We cannot use document.styleSheets as it does not handle variables in shorthand properties sanely,
// see https://github.com/element-hq/element-web/issues/26761
const getExportCSS = async (usedClasses: Set<string>): Promise<string> => {
    // only include bundle.css and light theme styling
    const hrefs = ["bundle.css", "theme-light.css"].map((name) => {
        return document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href$="${name}"]`)?.href;
    });

    let css = "";

    for (const href of hrefs) {
        if (!href) continue;
        const res = await fetch(href);
        const text = await res.text();
        css += mutateCssText(text);
    }

    return css + customCSS;
};

export default getExportCSS;
