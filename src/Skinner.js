/*
Copyright 2015, 2016 OpenMarket Ltd

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

class Skinner {
    constructor() {
        this.components = null;
    }

    getComponent(name) {
        if (this.components === null) {
            throw new Error(
                "Attempted to get a component before a skin has been loaded."+
                " This is probably because either:"+
                " a) Your app has not called sdk.loadSkin(), or"+
                " b) A component has called getComponent at the root level",
            );
        }
        let comp = this.components[name];
        // XXX: Temporarily also try 'views.' as we're currently
        // leaving the 'views.' off views.
        if (!comp) {
            comp = this.components['views.'+name];
        }

        if (!comp) {
            throw new Error("No such component: "+name);
        }

        // components have to be functions.
        const validType = typeof comp === 'function';
        if (!validType) {
            throw new Error(`Not a valid component: ${name}.`);
        }
        return comp;
    }

    load(skinObject) {
        if (this.components !== null) {
            throw new Error(
                "Attempted to load a skin while a skin is already loaded"+
                "If you want to change the active skin, call resetSkin first");
        }
        this.components = {};
        const compKeys = Object.keys(skinObject.components);
        for (let i = 0; i < compKeys.length; ++i) {
            const comp = skinObject.components[compKeys[i]];
            this.addComponent(compKeys[i], comp);
        }
    }

    addComponent(name, comp) {
        let slot = name;
        if (comp.replaces !== undefined) {
            if (comp.replaces.indexOf('.') > -1) {
                slot = comp.replaces;
            } else {
                slot = name.substr(0, name.lastIndexOf('.') + 1) + comp.replaces.split('.').pop();
            }
        }
        this.components[slot] = comp;
    }

    reset() {
        this.components = null;
    }
}

// We define one Skinner globally, because the intention is
// very much that it is a singleton. Relying on there only being one
// copy of the module can be dicey and not work as browserify's
// behaviour with multiple copies of files etc. is erratic at best.
// XXX: We can still end up with the same file twice in the resulting
// JS bundle which is nonideal.
// See https://derickbailey.com/2016/03/09/creating-a-true-singleton-in-node-js-with-es6-symbols/
// or https://nodejs.org/api/modules.html#modules_module_caching_caveats
// ("Modules are cached based on their resolved filename")
if (global.mxSkinner === undefined) {
    global.mxSkinner = new Skinner();
}
module.exports = global.mxSkinner;

