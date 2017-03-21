/*
Copyright 2015, 2016, 2017 OpenMarket Ltd

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
import * as React from 'react';
import * as sdk from '../../../index';
const MatrixClientPeg = require('../../../MatrixClientPeg');
const Modal = require('../../../Modal');
const RoomTagUtil = require('../../../RoomTagUtil');

module.exports = React.createClass({
  getDefaultProps: function() {
    return {
    };
  },

  getInitialState: function() {
    return {
      selectedTag: null,
      tags: RoomTagUtil.getTags(),
    };
  },

  onTagClicked: function(event) {
    const tagIndex = parseInt(event.target.attributes.getNamedItem("data-index").value);
    this.setState({selectedTag: tagIndex});
  },

  moveTagUp: function() {
    if (this.state.selectedTag === null ||
       this.state.selectedTag === 0
      ) {
      return;
    }
    const tags = RoomTagUtil.moveTag(this.state.selectedTag,-1);
    this.setState({tags, selectedTag: this.state.selectedTag-1});
  },

  moveTagDown: function() {
    if (this.state.selectedTag === null ||
       this.state.selectedTag === this.state.tags.length-1
      ) {
      return;
    }
    const tags = RoomTagUtil.moveTag(this.state.selectedTag,1);
    this.setState({tags, selectedTag: this.state.selectedTag+1});
  },

  addTag: function() {
    const TextInputDialog = sdk.getComponent("dialogs.TextInputDialog");
    Modal.createDialog(TextInputDialog, {
        title: "New Tag...",
        description:
            <div>
                Enter a new, unique room tag below.
            </div>,
        button: "Continue",
        validateInput: (text) => {
          const valid = RoomTagUtil.isTagValid(text);
          return valid.valid || valid.error;
        },
        onFinished: (confirmed, text) => {
            if (confirmed) {
              const tags = RoomTagUtil.addTag(text);
              this.setState({tags, selectedTag: tags.length-1});
            }
        },
    });
  },

  deleteTag: function() {
    if (this.state.selectedTag === null) {
      return;
    }
    const tag = this.state.tags[this.state.selectedTag];
    if(tag.protected) {
      return; // We cannot remove favourites/low priority.
    }
    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
    Modal.createDialog(QuestionDialog, {
        title: "Warning",
        description:
            <div>
                Deleting a tag will remove it from every room. This can not be undone.
            </div>,
        button: "Continue",
        onFinished: (confirmed) => {
            if (confirmed) {
              const tags = RoomTagUtil.deleteTag(this.state.selectedTag);
              const client = MatrixClientPeg.get();
              client.getRooms().filter((room) => {
                return Object.keys(room.tags).includes(tag.label || tag.name);
              }).forEach((room) => {
                client.deleteRoomTag(room.roomId, tag.label || tag.name);
              });
              this.setState({tags});
            }
        },
    });
  },

  render: function() {
    return (<div className="mx_UserSettings_section">
      <div className="mx_UserSettings_RoomTags_List">
        {
          this.state.tags.map((tag, i) => {
            let className = "mx_UserSettings_RoomTags_ListTag";
            if (this.state.selectedTag === i) {
              className += " selected";
            }
            return (
              <span key={i} onClick={this.onTagClicked} data-index={i} data-tag={tag.tag} className={className}>
                {tag.tag}
              </span>
            );
          })
        }
      </div>
      <div onClick={this.addTag} className="mx_textButton">Add</div>
      <div onClick={this.deleteTag} className="mx_textButton">Delete</div>
      <div onClick={this.moveTagUp} className="mx_textButton">Move Up</div>
      <div onClick={this.moveTagDown} className="mx_textButton">Move Down</div>
    </div>);
  },
});
