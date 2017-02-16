//@flow

import React from 'react';
import classNames from 'classnames';

import sdk from '../../../index';
import Modal from '../../../Modal';
import ErrorDialog from '../dialogs/ErrorDialog';

export default class AudioRecorder extends React.Component {
  static propTypes = {
    sendAudioBlob: React.PropTypes.func.isRequired,
  };

  mediaRecorder: ?MediaRecorder = null;
  blobs: Array<Blob> = [];

  constructor(props: Object) {
    super(props);

    this.state = {
      recording: false,
    };
  }

  onRecordClicked = async () => {
    if(this.state.recording) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    } else {
      if(!navigator.mediaDevices || !MediaRecorder) {
        Modal.createDialog(ErrorDialog, {
          description: `Sorry, but the features required for push 
 to talk messages are not supported by your browser`,
        });
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
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

    this.mediaRecorder = new MediaRecorder(mediaStream);
    this.mediaRecorder.addEventListener('dataavailable',
      this.onMediaRecorderDataAvailable);
    this.mediaRecorder.addEventListener('stop',
      this.onMediaRecorderStop);
    this.mediaRecorder.start(1000);

    this.setState({recording: true});
  };

  onMediaRecorderDataAvailable = (event: BlobEvent) => {
    this.blobs.push(event.data);
  };

  onMediaRecorderStop = () => {
    // Chrome gives us video/webm even though we've requested audio
    // for some reason. The data's still just audio though.
    const mimeParts = this.blobs[0].type.split('/');
    mimeParts[0] = 'audio';

    const combinedBlob = new Blob(this.blobs, {type: mimeParts.join('/')});
    this.props.sendAudioBlob(combinedBlob);
    this.blobs = [];
    this.setState({recording: false});
  };

  componentWillUnmount() {
    this.mediaRecorder.stop();
    this.mediaStream.getTracks().forEach((track) => track.stop());
  }

  render() {
    const TintableSvg = sdk.getComponent("elements.TintableSvg");
    const AccessibleButton = sdk.getComponent("elements.AccessibleButton");

    const className = classNames('mx_MessageComposer_ptt', {
      'mx_MessageComposer_ptt--recording': this.state.recording,
    });

    const title = this.state.recording ? 'Start recording message' :
      'Stop recording message & send';

    return (
      <AccessibleButton element="div" key="controls_ptt" className={className}
           onClick={this.onRecordClicked} title={title}>
        <TintableSvg src="img/voice.svg" width="22" height="22"/>
      </AccessibleButton>
    );
  }
}
