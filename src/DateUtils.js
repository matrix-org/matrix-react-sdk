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

'use strict';
import counterpart from 'counterpart';

//var days = [counterpart.translate("Sun"), counterpart.translate("Mon"), counterpart.translate("Tue"), counterpart.translate("Wed"), counterpart.translate("Thu"), counterpart.translate("Fri"), counterpart.translate("Sat")];
//var months = [counterpart.translate("Jan"), counterpart.translate("Feb"), counterpart.translate("Mar"), counterpart.translate("Apr"), counterpart.translate("May"), counterpart.translate("Jun"), counterpart.translate("Jul"), counterpart.translate("Aug"), counterpart.translate("Sep"), counterpart.translate("Oct"), counterpart.translate("Nov"), counterpart.translate("Dec")];
var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

module.exports = {
    formatDate: function(date) {
        // date.toLocaleTimeString is completely system dependent.
        // just go 24h for now
        function pad(n) {
            return (n < 10 ? '0' : '') + n;
        }

		// TODO: use standard date localize function provided in counterpart
		var hoursAndMinutes = pad(date.getHours()) + ':' + pad(date.getMinutes());
        var now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return hoursAndMinutes;
        }
        else if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
        	// TODO: use standard date localize function provided in counterpart
            return counterpart.translate("%(weekDayName)s %(time)s", {weekDayName: counterpart.translate(days[date.getDay()]), time: hoursAndMinutes});
        }
        else /* if (now.getFullYear() === date.getFullYear()) */ {
        	// TODO: use standard date localize function provided in counterpart
            return counterpart.translate("%(weekDayName)s, %(monthName)s %(day)s %(time)s", {weekDayName: days[date.getDay()], monthName: months[date.getMonth()], day: date.getDate(), time: hoursAndMinutes});
        }
        /*
        else {
            return days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear() + " " + pad(date.getHours()) + ':' + pad(date.getMinutes());
        }
        */
    },

    formatTime: function(date) {
        //return pad(date.getHours()) + ':' + pad(date.getMinutes());
        return ('00' + date.getHours()).slice(-2) + ':' + ('00' + date.getMinutes()).slice(-2);
    }
};

