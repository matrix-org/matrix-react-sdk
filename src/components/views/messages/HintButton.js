
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import MatrixClientPeg from '../../../MatrixClientPeg';
import * as HtmlUtils from '../../../HtmlUtils';


export default class HintButton extends React.Component {

    static propTypes = {
        mxEvent: PropTypes.object.isRequired, // event with hints
        hint: PropTypes.any
    }

    constructor(props) {
        super(props);
        this.onClick = this.onClick.bind(this);
    }

    onClick() {
        const client = MatrixClientPeg.get();
        let txtToSend, msgType;
        txtToSend = this.props.hint.reply ? this.props.hint.reply : this.props.hint.body;
        msgType = this.props.hint.replynotify ? "m.notice" : "m.text";
        client.sendMessage(this.props.mxEvent.getRoomId(), {body:txtToSend,  msgtype: msgType});
    }

    render() {
        const client = MatrixClientPeg.get();
        const hint = this.props.hint;
        let body;
        let img;
        let url;
        if(hint.formatted_body){
            body = HtmlUtils.bodyToHtml(hint)
        }
        else if(hint.body) {
            body = hint.body
        }
        if(hint.img){
            if (hint.img.startsWith("mxc://")) {
                url = client.mxcUrlToHttp(hint.img)
                img = <img src={url}/>
            }
            else if (hint.img.startsWith("data:")) {
                img = <img src={hint.img}/>
            }
        }

        return (
            <div className="mx_HintButton" onClick={this.onClick}>{img}{body}</div>
        )
    }
}