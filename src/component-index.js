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

/*
 * THIS FILE IS AUTO-GENERATED
 * You can edit it you like, but your changes will be overwritten,
 * so you'd just be trying to swim upstream like a salmon.
 * You are not a salmon.
 *
 * To update it, run:
 *    ./reskindex.js -h header
 */

module.exports.components = {};
import structures$ContextualMenu from './components/structures/ContextualMenu';
structures$ContextualMenu && (module.exports.components['structures.ContextualMenu'] = structures$ContextualMenu);
import structures$CreateRoom from './components/structures/CreateRoom';
structures$CreateRoom && (module.exports.components['structures.CreateRoom'] = structures$CreateRoom);
import structures$FilePanel from './components/structures/FilePanel';
structures$FilePanel && (module.exports.components['structures.FilePanel'] = structures$FilePanel);
import structures$InteractiveAuth from './components/structures/InteractiveAuth';
structures$InteractiveAuth && (module.exports.components['structures.InteractiveAuth'] = structures$InteractiveAuth);
import structures$LoggedInView from './components/structures/LoggedInView';
structures$LoggedInView && (module.exports.components['structures.LoggedInView'] = structures$LoggedInView);
import structures$MatrixChat from './components/structures/MatrixChat';
structures$MatrixChat && (module.exports.components['structures.MatrixChat'] = structures$MatrixChat);
import structures$MessagePanel from './components/structures/MessagePanel';
structures$MessagePanel && (module.exports.components['structures.MessagePanel'] = structures$MessagePanel);
import structures$NotificationPanel from './components/structures/NotificationPanel';
structures$NotificationPanel && (module.exports.components['structures.NotificationPanel'] = structures$NotificationPanel);
import structures$RoomStatusBar from './components/structures/RoomStatusBar';
structures$RoomStatusBar && (module.exports.components['structures.RoomStatusBar'] = structures$RoomStatusBar);
import structures$RoomView from './components/structures/RoomView';
structures$RoomView && (module.exports.components['structures.RoomView'] = structures$RoomView);
import structures$ScrollPanel from './components/structures/ScrollPanel';
structures$ScrollPanel && (module.exports.components['structures.ScrollPanel'] = structures$ScrollPanel);
import structures$TimelinePanel from './components/structures/TimelinePanel';
structures$TimelinePanel && (module.exports.components['structures.TimelinePanel'] = structures$TimelinePanel);
import structures$UploadBar from './components/structures/UploadBar';
structures$UploadBar && (module.exports.components['structures.UploadBar'] = structures$UploadBar);
import structures$UserSettings from './components/structures/UserSettings';
structures$UserSettings && (module.exports.components['structures.UserSettings'] = structures$UserSettings);
import structures$login$ForgotPassword from './components/structures/login/ForgotPassword';
structures$login$ForgotPassword && (module.exports.components['structures.login.ForgotPassword'] = structures$login$ForgotPassword);
import structures$login$Login from './components/structures/login/Login';
structures$login$Login && (module.exports.components['structures.login.Login'] = structures$login$Login);
import structures$login$PostRegistration from './components/structures/login/PostRegistration';
structures$login$PostRegistration && (module.exports.components['structures.login.PostRegistration'] = structures$login$PostRegistration);
import structures$login$Registration from './components/structures/login/Registration';
structures$login$Registration && (module.exports.components['structures.login.Registration'] = structures$login$Registration);
import views$avatars$BaseAvatar from './components/views/avatars/BaseAvatar';
views$avatars$BaseAvatar && (module.exports.components['views.avatars.BaseAvatar'] = views$avatars$BaseAvatar);
import views$avatars$MemberAvatar from './components/views/avatars/MemberAvatar';
views$avatars$MemberAvatar && (module.exports.components['views.avatars.MemberAvatar'] = views$avatars$MemberAvatar);
import views$avatars$RoomAvatar from './components/views/avatars/RoomAvatar';
views$avatars$RoomAvatar && (module.exports.components['views.avatars.RoomAvatar'] = views$avatars$RoomAvatar);
import views$create_room$CreateRoomButton from './components/views/create_room/CreateRoomButton';
views$create_room$CreateRoomButton && (module.exports.components['views.create_room.CreateRoomButton'] = views$create_room$CreateRoomButton);
import views$create_room$Presets from './components/views/create_room/Presets';
views$create_room$Presets && (module.exports.components['views.create_room.Presets'] = views$create_room$Presets);
import views$create_room$RoomAlias from './components/views/create_room/RoomAlias';
views$create_room$RoomAlias && (module.exports.components['views.create_room.RoomAlias'] = views$create_room$RoomAlias);
import views$dialogs$BaseDialog from './components/views/dialogs/BaseDialog';
views$dialogs$BaseDialog && (module.exports.components['views.dialogs.BaseDialog'] = views$dialogs$BaseDialog);
import views$dialogs$ChatCreateOrReuseDialog from './components/views/dialogs/ChatCreateOrReuseDialog';
views$dialogs$ChatCreateOrReuseDialog && (module.exports.components['views.dialogs.ChatCreateOrReuseDialog'] = views$dialogs$ChatCreateOrReuseDialog);
import views$dialogs$ChatInviteDialog from './components/views/dialogs/ChatInviteDialog';
views$dialogs$ChatInviteDialog && (module.exports.components['views.dialogs.ChatInviteDialog'] = views$dialogs$ChatInviteDialog);
import views$dialogs$ConfirmUserActionDialog from './components/views/dialogs/ConfirmUserActionDialog';
views$dialogs$ConfirmUserActionDialog && (module.exports.components['views.dialogs.ConfirmUserActionDialog'] = views$dialogs$ConfirmUserActionDialog);
import views$dialogs$DeactivateAccountDialog from './components/views/dialogs/DeactivateAccountDialog';
views$dialogs$DeactivateAccountDialog && (module.exports.components['views.dialogs.DeactivateAccountDialog'] = views$dialogs$DeactivateAccountDialog);
import views$dialogs$ErrorDialog from './components/views/dialogs/ErrorDialog';
views$dialogs$ErrorDialog && (module.exports.components['views.dialogs.ErrorDialog'] = views$dialogs$ErrorDialog);
import views$dialogs$InteractiveAuthDialog from './components/views/dialogs/InteractiveAuthDialog';
views$dialogs$InteractiveAuthDialog && (module.exports.components['views.dialogs.InteractiveAuthDialog'] = views$dialogs$InteractiveAuthDialog);
import views$dialogs$NeedToRegisterDialog from './components/views/dialogs/NeedToRegisterDialog';
views$dialogs$NeedToRegisterDialog && (module.exports.components['views.dialogs.NeedToRegisterDialog'] = views$dialogs$NeedToRegisterDialog);
import views$dialogs$QuestionDialog from './components/views/dialogs/QuestionDialog';
views$dialogs$QuestionDialog && (module.exports.components['views.dialogs.QuestionDialog'] = views$dialogs$QuestionDialog);
import views$dialogs$SessionRestoreErrorDialog from './components/views/dialogs/SessionRestoreErrorDialog';
views$dialogs$SessionRestoreErrorDialog && (module.exports.components['views.dialogs.SessionRestoreErrorDialog'] = views$dialogs$SessionRestoreErrorDialog);
import views$dialogs$SetDisplayNameDialog from './components/views/dialogs/SetDisplayNameDialog';
views$dialogs$SetDisplayNameDialog && (module.exports.components['views.dialogs.SetDisplayNameDialog'] = views$dialogs$SetDisplayNameDialog);
import views$dialogs$TextInputDialog from './components/views/dialogs/TextInputDialog';
views$dialogs$TextInputDialog && (module.exports.components['views.dialogs.TextInputDialog'] = views$dialogs$TextInputDialog);
import views$dialogs$UnknownDeviceDialog from './components/views/dialogs/UnknownDeviceDialog';
views$dialogs$UnknownDeviceDialog && (module.exports.components['views.dialogs.UnknownDeviceDialog'] = views$dialogs$UnknownDeviceDialog);
import views$elements$AccessibleButton from './components/views/elements/AccessibleButton';
views$elements$AccessibleButton && (module.exports.components['views.elements.AccessibleButton'] = views$elements$AccessibleButton);
import views$elements$AddressSelector from './components/views/elements/AddressSelector';
views$elements$AddressSelector && (module.exports.components['views.elements.AddressSelector'] = views$elements$AddressSelector);
import views$elements$AddressTile from './components/views/elements/AddressTile';
views$elements$AddressTile && (module.exports.components['views.elements.AddressTile'] = views$elements$AddressTile);
import views$elements$DeviceVerifyButtons from './components/views/elements/DeviceVerifyButtons';
views$elements$DeviceVerifyButtons && (module.exports.components['views.elements.DeviceVerifyButtons'] = views$elements$DeviceVerifyButtons);
import views$elements$DirectorySearchBox from './components/views/elements/DirectorySearchBox';
views$elements$DirectorySearchBox && (module.exports.components['views.elements.DirectorySearchBox'] = views$elements$DirectorySearchBox);
import views$elements$Dropdown from './components/views/elements/Dropdown';
views$elements$Dropdown && (module.exports.components['views.elements.Dropdown'] = views$elements$Dropdown);
import views$elements$EditableText from './components/views/elements/EditableText';
views$elements$EditableText && (module.exports.components['views.elements.EditableText'] = views$elements$EditableText);
import views$elements$EditableTextContainer from './components/views/elements/EditableTextContainer';
views$elements$EditableTextContainer && (module.exports.components['views.elements.EditableTextContainer'] = views$elements$EditableTextContainer);
import views$elements$EmojiText from './components/views/elements/EmojiText';
views$elements$EmojiText && (module.exports.components['views.elements.EmojiText'] = views$elements$EmojiText);
import views$elements$MemberEventListSummary from './components/views/elements/MemberEventListSummary';
views$elements$MemberEventListSummary && (module.exports.components['views.elements.MemberEventListSummary'] = views$elements$MemberEventListSummary);
import views$elements$PowerSelector from './components/views/elements/PowerSelector';
views$elements$PowerSelector && (module.exports.components['views.elements.PowerSelector'] = views$elements$PowerSelector);
import views$elements$ProgressBar from './components/views/elements/ProgressBar';
views$elements$ProgressBar && (module.exports.components['views.elements.ProgressBar'] = views$elements$ProgressBar);
import views$elements$TintableSvg from './components/views/elements/TintableSvg';
views$elements$TintableSvg && (module.exports.components['views.elements.TintableSvg'] = views$elements$TintableSvg);
import views$elements$TruncatedList from './components/views/elements/TruncatedList';
views$elements$TruncatedList && (module.exports.components['views.elements.TruncatedList'] = views$elements$TruncatedList);
import views$elements$UserSelector from './components/views/elements/UserSelector';
views$elements$UserSelector && (module.exports.components['views.elements.UserSelector'] = views$elements$UserSelector);
import views$login$CaptchaForm from './components/views/login/CaptchaForm';
views$login$CaptchaForm && (module.exports.components['views.login.CaptchaForm'] = views$login$CaptchaForm);
import views$login$CasLogin from './components/views/login/CasLogin';
views$login$CasLogin && (module.exports.components['views.login.CasLogin'] = views$login$CasLogin);
import views$login$CountryDropdown from './components/views/login/CountryDropdown';
views$login$CountryDropdown && (module.exports.components['views.login.CountryDropdown'] = views$login$CountryDropdown);
import views$login$CustomServerDialog from './components/views/login/CustomServerDialog';
views$login$CustomServerDialog && (module.exports.components['views.login.CustomServerDialog'] = views$login$CustomServerDialog);
import views$login$InteractiveAuthEntryComponents from './components/views/login/InteractiveAuthEntryComponents';
views$login$InteractiveAuthEntryComponents && (module.exports.components['views.login.InteractiveAuthEntryComponents'] = views$login$InteractiveAuthEntryComponents);
import views$login$LoginFooter from './components/views/login/LoginFooter';
views$login$LoginFooter && (module.exports.components['views.login.LoginFooter'] = views$login$LoginFooter);
import views$login$LoginHeader from './components/views/login/LoginHeader';
views$login$LoginHeader && (module.exports.components['views.login.LoginHeader'] = views$login$LoginHeader);
import views$login$PasswordLogin from './components/views/login/PasswordLogin';
views$login$PasswordLogin && (module.exports.components['views.login.PasswordLogin'] = views$login$PasswordLogin);
import views$login$RegistrationForm from './components/views/login/RegistrationForm';
views$login$RegistrationForm && (module.exports.components['views.login.RegistrationForm'] = views$login$RegistrationForm);
import views$login$ServerConfig from './components/views/login/ServerConfig';
views$login$ServerConfig && (module.exports.components['views.login.ServerConfig'] = views$login$ServerConfig);
import views$messages$MAudioBody from './components/views/messages/MAudioBody';
views$messages$MAudioBody && (module.exports.components['views.messages.MAudioBody'] = views$messages$MAudioBody);
import views$messages$MFileBody from './components/views/messages/MFileBody';
views$messages$MFileBody && (module.exports.components['views.messages.MFileBody'] = views$messages$MFileBody);
import views$messages$MImageBody from './components/views/messages/MImageBody';
views$messages$MImageBody && (module.exports.components['views.messages.MImageBody'] = views$messages$MImageBody);
import views$messages$MVideoBody from './components/views/messages/MVideoBody';
views$messages$MVideoBody && (module.exports.components['views.messages.MVideoBody'] = views$messages$MVideoBody);
import views$messages$MessageEvent from './components/views/messages/MessageEvent';
views$messages$MessageEvent && (module.exports.components['views.messages.MessageEvent'] = views$messages$MessageEvent);
import views$messages$SenderProfile from './components/views/messages/SenderProfile';
views$messages$SenderProfile && (module.exports.components['views.messages.SenderProfile'] = views$messages$SenderProfile);
import views$messages$TextualBody from './components/views/messages/TextualBody';
views$messages$TextualBody && (module.exports.components['views.messages.TextualBody'] = views$messages$TextualBody);
import views$messages$TextualEvent from './components/views/messages/TextualEvent';
views$messages$TextualEvent && (module.exports.components['views.messages.TextualEvent'] = views$messages$TextualEvent);
import views$messages$UnknownBody from './components/views/messages/UnknownBody';
views$messages$UnknownBody && (module.exports.components['views.messages.UnknownBody'] = views$messages$UnknownBody);
import views$room_settings$AliasSettings from './components/views/room_settings/AliasSettings';
views$room_settings$AliasSettings && (module.exports.components['views.room_settings.AliasSettings'] = views$room_settings$AliasSettings);
import views$room_settings$ColorSettings from './components/views/room_settings/ColorSettings';
views$room_settings$ColorSettings && (module.exports.components['views.room_settings.ColorSettings'] = views$room_settings$ColorSettings);
import views$room_settings$UrlPreviewSettings from './components/views/room_settings/UrlPreviewSettings';
views$room_settings$UrlPreviewSettings && (module.exports.components['views.room_settings.UrlPreviewSettings'] = views$room_settings$UrlPreviewSettings);
import views$rooms$Autocomplete from './components/views/rooms/Autocomplete';
views$rooms$Autocomplete && (module.exports.components['views.rooms.Autocomplete'] = views$rooms$Autocomplete);
import views$rooms$AuxPanel from './components/views/rooms/AuxPanel';
views$rooms$AuxPanel && (module.exports.components['views.rooms.AuxPanel'] = views$rooms$AuxPanel);
import views$rooms$EntityTile from './components/views/rooms/EntityTile';
views$rooms$EntityTile && (module.exports.components['views.rooms.EntityTile'] = views$rooms$EntityTile);
import views$rooms$EventTile from './components/views/rooms/EventTile';
views$rooms$EventTile && (module.exports.components['views.rooms.EventTile'] = views$rooms$EventTile);
import views$rooms$LinkPreviewWidget from './components/views/rooms/LinkPreviewWidget';
views$rooms$LinkPreviewWidget && (module.exports.components['views.rooms.LinkPreviewWidget'] = views$rooms$LinkPreviewWidget);
import views$rooms$MemberDeviceInfo from './components/views/rooms/MemberDeviceInfo';
views$rooms$MemberDeviceInfo && (module.exports.components['views.rooms.MemberDeviceInfo'] = views$rooms$MemberDeviceInfo);
import views$rooms$MemberInfo from './components/views/rooms/MemberInfo';
views$rooms$MemberInfo && (module.exports.components['views.rooms.MemberInfo'] = views$rooms$MemberInfo);
import views$rooms$MemberList from './components/views/rooms/MemberList';
views$rooms$MemberList && (module.exports.components['views.rooms.MemberList'] = views$rooms$MemberList);
import views$rooms$MemberTile from './components/views/rooms/MemberTile';
views$rooms$MemberTile && (module.exports.components['views.rooms.MemberTile'] = views$rooms$MemberTile);
import views$rooms$MessageComposer from './components/views/rooms/MessageComposer';
views$rooms$MessageComposer && (module.exports.components['views.rooms.MessageComposer'] = views$rooms$MessageComposer);
import views$rooms$MessageComposerInput from './components/views/rooms/MessageComposerInput';
views$rooms$MessageComposerInput && (module.exports.components['views.rooms.MessageComposerInput'] = views$rooms$MessageComposerInput);
import views$rooms$MessageComposerInputOld from './components/views/rooms/MessageComposerInputOld';
views$rooms$MessageComposerInputOld && (module.exports.components['views.rooms.MessageComposerInputOld'] = views$rooms$MessageComposerInputOld);
import views$rooms$PresenceLabel from './components/views/rooms/PresenceLabel';
views$rooms$PresenceLabel && (module.exports.components['views.rooms.PresenceLabel'] = views$rooms$PresenceLabel);
import views$rooms$ReadReceiptMarker from './components/views/rooms/ReadReceiptMarker';
views$rooms$ReadReceiptMarker && (module.exports.components['views.rooms.ReadReceiptMarker'] = views$rooms$ReadReceiptMarker);
import views$rooms$RoomHeader from './components/views/rooms/RoomHeader';
views$rooms$RoomHeader && (module.exports.components['views.rooms.RoomHeader'] = views$rooms$RoomHeader);
import views$rooms$RoomList from './components/views/rooms/RoomList';
views$rooms$RoomList && (module.exports.components['views.rooms.RoomList'] = views$rooms$RoomList);
import views$rooms$RoomNameEditor from './components/views/rooms/RoomNameEditor';
views$rooms$RoomNameEditor && (module.exports.components['views.rooms.RoomNameEditor'] = views$rooms$RoomNameEditor);
import views$rooms$RoomPreviewBar from './components/views/rooms/RoomPreviewBar';
views$rooms$RoomPreviewBar && (module.exports.components['views.rooms.RoomPreviewBar'] = views$rooms$RoomPreviewBar);
import views$rooms$RoomSettings from './components/views/rooms/RoomSettings';
views$rooms$RoomSettings && (module.exports.components['views.rooms.RoomSettings'] = views$rooms$RoomSettings);
import views$rooms$RoomTile from './components/views/rooms/RoomTile';
views$rooms$RoomTile && (module.exports.components['views.rooms.RoomTile'] = views$rooms$RoomTile);
import views$rooms$RoomTopicEditor from './components/views/rooms/RoomTopicEditor';
views$rooms$RoomTopicEditor && (module.exports.components['views.rooms.RoomTopicEditor'] = views$rooms$RoomTopicEditor);
import views$rooms$SearchResultTile from './components/views/rooms/SearchResultTile';
views$rooms$SearchResultTile && (module.exports.components['views.rooms.SearchResultTile'] = views$rooms$SearchResultTile);
import views$rooms$SearchableEntityList from './components/views/rooms/SearchableEntityList';
views$rooms$SearchableEntityList && (module.exports.components['views.rooms.SearchableEntityList'] = views$rooms$SearchableEntityList);
import views$rooms$SimpleRoomHeader from './components/views/rooms/SimpleRoomHeader';
views$rooms$SimpleRoomHeader && (module.exports.components['views.rooms.SimpleRoomHeader'] = views$rooms$SimpleRoomHeader);
import views$rooms$TabCompleteBar from './components/views/rooms/TabCompleteBar';
views$rooms$TabCompleteBar && (module.exports.components['views.rooms.TabCompleteBar'] = views$rooms$TabCompleteBar);
import views$rooms$TopUnreadMessagesBar from './components/views/rooms/TopUnreadMessagesBar';
views$rooms$TopUnreadMessagesBar && (module.exports.components['views.rooms.TopUnreadMessagesBar'] = views$rooms$TopUnreadMessagesBar);
import views$rooms$UserTile from './components/views/rooms/UserTile';
views$rooms$UserTile && (module.exports.components['views.rooms.UserTile'] = views$rooms$UserTile);
import views$settings$ChangeAvatar from './components/views/settings/ChangeAvatar';
views$settings$ChangeAvatar && (module.exports.components['views.settings.ChangeAvatar'] = views$settings$ChangeAvatar);
import views$settings$ChangeDisplayName from './components/views/settings/ChangeDisplayName';
views$settings$ChangeDisplayName && (module.exports.components['views.settings.ChangeDisplayName'] = views$settings$ChangeDisplayName);
import views$settings$ChangePassword from './components/views/settings/ChangePassword';
views$settings$ChangePassword && (module.exports.components['views.settings.ChangePassword'] = views$settings$ChangePassword);
import views$settings$DevicesPanel from './components/views/settings/DevicesPanel';
views$settings$DevicesPanel && (module.exports.components['views.settings.DevicesPanel'] = views$settings$DevicesPanel);
import views$settings$DevicesPanelEntry from './components/views/settings/DevicesPanelEntry';
views$settings$DevicesPanelEntry && (module.exports.components['views.settings.DevicesPanelEntry'] = views$settings$DevicesPanelEntry);
import views$settings$EnableNotificationsButton from './components/views/settings/EnableNotificationsButton';
views$settings$EnableNotificationsButton && (module.exports.components['views.settings.EnableNotificationsButton'] = views$settings$EnableNotificationsButton);
import views$voip$CallView from './components/views/voip/CallView';
views$voip$CallView && (module.exports.components['views.voip.CallView'] = views$voip$CallView);
import views$voip$IncomingCallBox from './components/views/voip/IncomingCallBox';
views$voip$IncomingCallBox && (module.exports.components['views.voip.IncomingCallBox'] = views$voip$IncomingCallBox);
import views$voip$VideoFeed from './components/views/voip/VideoFeed';
views$voip$VideoFeed && (module.exports.components['views.voip.VideoFeed'] = views$voip$VideoFeed);
import views$voip$VideoView from './components/views/voip/VideoView';
views$voip$VideoView && (module.exports.components['views.voip.VideoView'] = views$voip$VideoView);
