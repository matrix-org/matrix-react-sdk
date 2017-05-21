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

var Skinner = require('./Skinner');

var t = require('counterpart');

t.registerTranslations('en', require('../languages/en'));
t.registerTranslations('pt-BR', require('../languages/pt-BR'));

t.setFallbackLocale('en');
t.setLocale(window.navigator.languages[0]);



module.exports.loadSkin = function(skinObject) {
    Skinner.load(skinObject);
};

module.exports.resetSkin = function() {
    Skinner.reset();
};

module.exports.getComponent = function(componentName) {
    return Skinner.getComponent(componentName);
};
