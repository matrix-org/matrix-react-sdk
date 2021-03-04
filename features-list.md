# About
This document outlines list of features implemented for pegacorn-communicate project and relevant configurations changed as a part of user stories.

### OOTB Feature items
OOTB user stories signify a feature which is out of box and do not need modification.

### OOTB Modified Feature items
Communicate uses OOTB modified user stories which means that feature needs to have values customised in order to fulfill requirement of a given user story.

## Features
### Feature: 188662
Web: As an Authenticated Practitioner, I should be able to personalise the Voice & Video Settings, so that I can control certain system behaviours that will maximise my user experience.

Out of box features
The following user settings are controlled by the specified configuration values in the config-communicate.json file:
* Audio output - controlled by the OOTB webrtc_audiooutput setting, no change required for this story
* Microphone - controlled by the OOTB webrtc_audioinput setting, no change required for this story
* Camera - controlled by the OOTB webrtc_videoinput setting, no change required for this story

Customized Features through our values inserted through communicate-config.json and UI.Feature
* Mirror local video feed (new config item ShowSettingMirrorLocalVideoFeed to toggle if this setting is visible) - controlled by the OOTB VideoView.flipVideoHorizontally setting, which defaults to false, so no override config value is required.
* Allow Peer-to-Peer for 1:1 calls (new config item ShowSettingAllowPeerToPeerForOneToOneCalls to toggle if this setting is visible) - controlled by the OOTB webRtcAllowPeerToPeer setting, which defaults to true, so a config override was attempted to be added to set this to false, however this didn't appear to work, so instead the inverse OOTB webRtcForceTURN setting was set the true, to override the default for webRtcAllowPeerToPeer and set it to be false)
* Allow fallback call assist server (new config item ShowSettingAllowFallbackCallAssist to toggle if this setting is visible) - controlled by the OOTB fallbackICEServerAllowed setting, which defaults to null (prompt the user), so a config override has been added to set this to false

### Feature:188496
Web: As an Authenticated Practitioner, I should not be able to view certain Settings that are not applicable or do not need to be displayed to the user, so that I only see applicable settings
- Flair gets removed automatically when you disable Community. As such, this feature was available out of the box with a config change.
- Community is not enabled by default (NOTE: on https://app.element.io they have enabled Flair), so Flair is disabled by default.
**config**
Community feature controls Flair feature at the moment in Setting.ts and this switch is turned off via communicate-config.json by using `"UIFeature.communities": false`.




