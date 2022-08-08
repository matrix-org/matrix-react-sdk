// The translations in this file can be added with:
//   #registerTranslations('cs', require('counterpart/locales/cs');

'use strict';

module.exports = {
  counterpart: {
    names: require('date-names/cs'),
    pluralize: require('pluralizers/cs'),

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
