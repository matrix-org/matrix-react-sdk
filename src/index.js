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

import Skinner from './Skinner';
import request from 'browser-request';
import counterpart from 'counterpart';

module.exports.loadSkin = function(skinObject) {
    Skinner.load(skinObject);
};

module.exports.resetSkin = function() {
    Skinner.reset();
};

module.exports.getComponent = function(componentName) {
    return Skinner.getComponent(componentName);
};

module.exports.setLanguage = function(language) {
  // load our own translations
  const i18nFolder = 'i18n/';
  request(i18nFolder + 'languages.json', function(err, response, body) {
    function getLanguage(langPath, langCode, callback) {
        let response_return = {};
        let resp_raw = {};
        request(
            { method: "GET", url: langPath },
            (err, response, body) => {
                if (err || response.status < 200 || response.status >= 300) {
                    // Lack of a config isn't an error, we should
                    // just use the defaults.
                    // Also treat a blank config as no config, assuming
                    // the status code is 0, because we don't get 404s
                    // from file: URIs so this is the only way we can
                    // not fail if the file doesn't exist when loading
                    // from a file:// URI.
                    if (response) {
                        if (response.status == 404 || (response.status == 0 && body == '')) {
                            resp_raw = {};
                        }
                    }
                    const resp = {err: err, response: resp_raw};
                    err = resp['err'];
                    const response_cb = resp['response'];
                    callback(err, response_cb, langCode);
                    return;
                }

                // We parse the JSON ourselves rather than use the JSON
                // parameter, since this throws a parse error on empty
                // which breaks if there's no config.json and we're
                // loading from the filesystem (see above).

                response_return = JSON.parse(body);
                callback(null, response_return, langCode);
                return;
            }
        );
        return;
    }

    function callbackLanguage(err, langJson, langCode){
      if (err !== null) {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        Modal.createDialog(ErrorDialog, {
            title: counterpart.translate('Error changing language'),
            description: counterpart.translate('Riot was unable to find the correct Data for the selected Language.'),
        });
        return;
      } else {
        counterpart.registerTranslations(langCode, langJson);
      }
    }

    let languages = {};
    if(err){
      console.error(err);
    }else {
      languages = JSON.parse(body);
    }

    if (!language){
      const language = navigator.languages[0] || navigator.language || navigator.userLanguage;
      if (languages.hasOwnProperty(language)) {
        getLanguage(i18nFolder + languages[language], language, callbackLanguage);
        if (language.indexOf("-") > -1) {
          counterpart.setLocale(language.split('-')[0]);
          UserSettingsStore.setLocalSetting('language', language.split('-')[0]);
        } else {
          counterpart.setLocale(language);
          UserSettingsStore.setLocalSetting('language', language);
        }
      }
      getLanguage(i18nFolder + languages['en'], 'en', callbackLanguage);
      counterpart.setFallbackLocale('en');
    } else {
      if (languages.hasOwnProperty(language)) {
        getLanguage(i18nFolder + languages[language], language, callbackLanguage);
        if (language.indexOf("-") > -1) {
          counterpart.setLocale(language.split('-')[0]);
          UserSettingsStore.setLocalSetting('language', language.split('-')[0]);
        } else {
          counterpart.setLocale(language);
          UserSettingsStore.setLocalSetting('language', language);
        }
      }
      getLanguage(i18nFolder + languages['en'], 'en', callbackLanguage);
      counterpart.setFallbackLocale('en');
    }
  })
};
