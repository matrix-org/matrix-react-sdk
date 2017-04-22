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
var counterpart = require('counterpart');

counterpart.registerTranslations('en', require('./i18n/strings/en_EN'));
counterpart.registerTranslations('en', require('./i18n/global/en_EN'));
counterpart.registerTranslations('de', require('./i18n/strings/de_DE'));
counterpart.registerTranslations('de', require('./i18n/global/de_DE'));
var pt1 = require('./i18n/strings/pt_BR');
counterpart.registerTranslations('pt', pt1);
counterpart.registerTranslations('pt-BR', pt1);
var pt2 = require('./i18n/global/pt_BR');
counterpart.registerTranslations('pt', pt2);
counterpart.registerTranslations('pt-BR', pt2);

if ( navigator.languages ) {
    counterpart.setFallbackLocale( navigator.languages );
    counterpart.setLocale(window.navigator.languages[0]);
} else {
    counterpart.setFallbackLocale( 'en' );
    if ( navigator.userLanguage ) { //IE
        counterpart.setLocale( navigator.userLanguage );
    }
}

module.exports.loadSkin = function(skinObject) {
    Skinner.load(skinObject);
};

module.exports.resetSkin = function() {
    Skinner.reset();
};

module.exports.getComponent = function(componentName) {
    return Skinner.getComponent(componentName);
};




