/*
 * skinned-sdk.js
 *
 * Skins the react-sdk with a few stub components which we expect the
 * application to provide
 */

/* this is a convenient place to ensure we load the compatibility libraries we expect our
 * app to provide
 */

// for ES6 stuff like startsWith() and Object.values() that babel doesn't do by
// default
require('babel-polyfill');

const sdk = require("../src/index");

const skin = require('../src/component-index.js');
const StubComponent = require('./components/stub-component.js');

const components = skin.components;
components['structures.LeftPanel'] = class extends StubComponent {};
components['structures.RightPanel'] = class extends StubComponent {};
components['structures.RoomDirectory'] = class extends StubComponent {};
components['views.globals.MatrixToolbar'] = class extends StubComponent {};
components['views.globals.GuestWarningBar'] = class extends StubComponent {};
components['views.globals.NewVersionBar'] = class extends StubComponent {};
components['views.elements.Spinner'] = class Spinner extends StubComponent {};
components['views.messages.DateSeparator'] = class DateSeparator extends StubComponent {};
components['views.messages.MessageTimestamp'] = class MessageTimestamp extends StubComponent {};
components['views.messages.SenderProfile'] = class SenderProfile extends StubComponent {};
components['views.rooms.SearchBar'] = class extends StubComponent {};

sdk.loadSkin(skin);

module.exports = sdk;
