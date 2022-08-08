// The translations in this file can be added with:
//   #registerTranslations('nl', require('counterpart/locales/nl');

'use strict';

module.exports = {
  counterpart: {
    names: require('date-names/nl'),
    pluralize: require('pluralizers/nl'),

    formats: {
      date: {
        'default':  '%e %b %Y',
        long:       '%A %e %B %Y',
        short:      '%Y-%m-%d'
      },

      time: {
        'default':  '%H.%M',
        long:       '%H.%M.%S',
        short:      '%H.%M'
      },

      datetime: {
        'default':  '%e %b %Y, %H.%M',
        long:       '%A %e %B %Y, %H.%M.%S',
        short:      '%Y-%m-%d %H.%M'
      }
    }
  }
};
