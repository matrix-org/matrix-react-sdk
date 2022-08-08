// The translations in this file can be added with:
//   #registerTranslations('sk', require('counterpart/locales/sk');

'use strict';

module.exports = {
  counterpart: {
    names: require('date-names/sk'),
    pluralize: require('pluralizers/sk'),

    formats: {
      date: {
        'default':  '%a %e. %b %Y',
        long:       '%A %e. %B %Y',
        short:      '%e. %-m. %y'
      },

      time: {
        'default':  '%-H:%M hod.',
        long:       '%-H:%M:%S %z',
        short:      '%-H:%M'
      },

      datetime: {
        'default':  '%a %e. %b %Y, %-H:%M hod.',
        long:       '%A %e. %B %Y, %-H:%M:%S %z',
        short:      '%e. %-m. %y, %-H:%M'
      }
    }
  }
};
