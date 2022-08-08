// The translations in this file can be added with:
//   #registerTranslations('pt-br', require('counterpart/locales/pt-br');

'use strict';

module.exports = {
  counterpart: {
    names: require('date-names/pt-br'),
    pluralize: require('pluralizers/pt-br'),

    formats: {
      date: {
        'default':  '%a, %e de %b de %Y',
        long:       '%A, %e de %B de %Y',
        short:      '%d/%m/%y'
      },

      time: {
        'default':  '%H:%M',
        long:       '%H:%M:%S %z',
        short:      '%H:%M'
      },

      datetime: {
        'default':  '%a, %e de %b de %Y às %H:%M',
        long:       '%A, %e de %B de %Y às %H:%M:%S %z',
        short:      '%d/%m/%y às %H:%M'
      }
    }
  }
};
