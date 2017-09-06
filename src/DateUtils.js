/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 MTRNord

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

'use strict';
import { _t, getCurrentLanguage } from './languageHandler';

module.exports = {
    formatDate: function(date, showTwelveHour=false) {
        const currentLanguage = getCurrentLanguage();
        const now = new Date();
        if (date.toLocaleDateString(currentLanguage) === now.toLocaleDateString(currentLanguage)) {
            return date.toLocaleString(currentLanguage, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: showTwelveHour,
            });
        } else if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
            return date.toLocaleString(currentLanguage, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: showTwelveHour,
            });
        } else if (now.getFullYear() === date.getFullYear()) {
            return date.toLocaleString(currentLanguage, {
                weekday: 'short',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: showTwelveHour,
            });
        }
        return date.toLocaleString(currentLanguage, {
            weekday: 'short',
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: showTwelveHour,
        });
    },

    formatFullDate: function(date, showTwelveHour=false) {
        const currentLanguage = getCurrentLanguage();
        return date.toLocaleString(currentLanguage, {
            weekday: 'short',
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: showTwelveHour,
        });
    },

    formatDateSeparator: function(date) {
        const currentLanguage = getCurrentLanguage();
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return _t('Today');
        } else if (date.toDateString() === yesterday.toDateString()) {
            return _t('Yesterday');
        } else if (today.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
            return date.toLocaleString(currentLanguage, {
                weekday: 'long',
            });
        } else if (today.getTime() - date.getTime() < 365 * 24 * 60 * 60 * 1000) {
            return date.toLocaleString(currentLanguage, {
                weekday: 'short',
                month: 'short',
                day: '2-digit',
            });
        } else {
            return date.toLocaleString(currentLanguage, {
                weekday: 'short',
                month: 'short',
                day: '2-digit',
                year: 'numeric',
            });
        }
    },

    formatTime: function(date, showTwelveHour=false) {
        const currentLanguage = getCurrentLanguage();
        return date.toLocaleString(currentLanguage, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: showTwelveHour,
        });
    },
};
