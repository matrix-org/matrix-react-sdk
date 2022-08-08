// The translations in this file can be added with:
//   #registerTranslations('ru', require('counterpart/locales/ru');

'use strict';

module.exports = {
  counterpart: {
    names: require('date-names/ru'),
    pluralize: require('pluralizers/ru'),

    formats: {
      date: {
        'default':  '%d.%m.%Y',
        long:       '%A, %d.%m.%Y',
        short:      '%d.%m.%Y'
      },

      time: {
        'default':  '%H:%M',
        long:       '%H:%M:%S',
        short:      '%H:%M'
      },

      datetime: {
        'default':  '%d.%m.%Y, %H:%M',
        long:       '%A, %d.%m.%Y, %H:%M:%S',
        short:      '%d.%m.%Y %H:%M'
      }
    }
  }
};
