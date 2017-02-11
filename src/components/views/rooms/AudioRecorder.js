//@flow

import React from 'react';

import sdk from '../../../index';
import Modal from '../../../Modal';
import ErrorDialog from '../dialogs/ErrorDialog';
import MediaStreamRecorder from 'msr';

export default class AudioRecorder extends React.Component {
  static propTypes = {
    sendAudioBlob: React.PropTypes.func.isRequired,
  };

  mediaStream: ?MediaStream = null;
  recorder: ?MediaStreamRecorder = null;
  blobs: Array<Blob> = [];

  constructor(props: Object) {
    super(props);

    this.state = {
      recording: false,
    };
  }

  onRecordClicked = async () => {
    if(this.state.recording && this.mediaStream) {
      this.recorder.stop();
      window.ConcatenateBlobs(this.blobs, this.blobs[0].type, (blob) => {
        console.log(blob);
        this.props.sendAudioBlob(blob);
        this.blobs = [];
        this.recorder = null;
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      });
    } else {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        this.onUserMediaSuccess(mediaStream);
      } catch (e) {
        this.onUserMediaFailure(e);
      }
    }
  };

  onUserMediaFailure = () => {
    Modal.createDialog(ErrorDialog, {
      description: "Failed to start recording.",
    });
  };

  onUserMediaSuccess = (mediaStream: MediaStream) => {
    this.mediaStream = mediaStream;
    this.recorder = new MediaStreamRecorder(this.mediaStream);
    this.recorder.recorderType = class extends MediaStreamRecorder.StereoAudioRecorder {
      constructor(mediaStream: MediaStream) {
        super(mediaStream);
        this.audioChannels = 1;
      }
    };
    this.recorder.ondataavailable = (blob) => {
      this.blobs.push(blob);
    };
    this.recorder.mimeType = 'audio/wav';
    this.recorder.start(100);
    this.setState({recording: true});
  };

  render() {
    const TintableSvg = sdk.getComponent("elements.TintableSvg");
    return (
      <div key="controls_ptt" className="mx_MessageComposer_voicecall"
           onClick={this.onRecordClicked} title="Record & send message">
        <TintableSvg src="img/voice.svg" width="22" height="22"/>
      </div>
    );
  }
}
