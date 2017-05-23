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
import * as MatrixClientPeg from '../../../MatrixClientPeg';
import Modal from '../../../Modal';
import RoomTagUtil from '../../../RoomTagUtil';

module.exports = React.createClass({

  getInitialState: function() {
    return {
      selectedTag: null,
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
    RoomTagUtil.moveTag(this.state.selectedTag, -1);
    this.setState({selectedTag: this.state.selectedTag - 1});
  },

  moveTagDown: function() {
    if (this.state.selectedTag === null ||
       this.state.selectedTag === RoomTagUtil.tags.length-1
      ) {
      return;
    }
    RoomTagUtil.moveTag(this.state.selectedTag, 1);
    this.setState({selectedTag: this.state.selectedTag+1});
  },

  addTag: function() {
    const ModifyTagDialog = sdk.getComponent("dialogs.ModifyTagDialog");
    Modal.createDialog(ModifyTagDialog, {
        onFinished: (modified, newTag) => {
            if (modified) {
              const position = this.state.selectedTag || 0;
              RoomTagUtil.addTag(position, newTag.name, newTag.order);
              this.forceUpdate();
            }
        },
    });
  },

  modifyTag: function() {
    const ModifyTagDialog = sdk.getComponent("dialogs.ModifyTagDialog");
    const tag = RoomTagUtil.tags[this.state.selectedTag];
    Modal.createDialog(ModifyTagDialog, {
        tag,
        index: this.state.selectedTag,
        onFinished: (modified, newTag) => {
            if (modified) {
              RoomTagUtil.modifyTag(this.state.selectedTag, newTag.name, newTag.order);
              this.forceUpdate();
            }
        },
    });
  },

  deleteTag: function() {
    if (this.state.selectedTag === null) {
      return;
    }
    const tag = RoomTagUtil.tags[this.state.selectedTag];
    const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

    Modal.createDialog(QuestionDialog, {
        title: "Warning",
        description:
            <div>
                Deleting a tag will remove it from every room. This can not be undone.
            </div>,
        button: "Continue",
        onFinished: (confirmed) => {
            if (confirmed) {
              try {
                RoomTagUtil.deleteTag(this.state.selectedTag);
                this.state.selectedTag -= 1;
              } catch (ex) {
                Modal.createDialog(ErrorDialog, {
                    description: "Cannot delete tag: " + ex.message,
                });
                return;
              }
              // Remove the tag from each room.
              const client = MatrixClientPeg.get();
              client.getRooms().filter((room) => {
                return Object.keys(room.tags).includes(tag.alias || tag.name);
              }).forEach((room) => {
                client.deleteRoomTag(room.roomId, tag.alias || tag.name);
              });
              this.setState({selectedTag: this.state.selectedTag});
            }
        },
    });
  },

  render: function() {
    let modMenu = null;
    if (this.state.selectedTag !== null) {
      const tagDeletable = RoomTagUtil.tags[this.state.selectedTag].deletable;
      const tagModifiable = RoomTagUtil.tags[this.state.selectedTag].modifiable;
      if(tagDeletable || tagModifiable) {
        modMenu = (
          <span>
          !tagModifiable ? (<div onClick={this.modifyTag} className="mx_textButton">Modify</div>): null
          !tagDeletable ? (<div onClick={this.deleteTag} className="mx_textButton">Modify</div>): null
          </span>
        );
      }
    }
    return (<div className="mx_UserSettings_section">
      <div className="mx_UserSettings_RoomTags_List">
        {
          RoomTagUtil.tags.map((tag, i) => {
            let className = "mx_UserSettings_RoomTags_ListTag";
            if (this.state.selectedTag === i) {
              className += " selected";
            }
            return (
              <span key={i} onClick={this.onTagClicked} data-index={i} data-tag={tag.alias || tag.name} className={className}>
                {tag.name}
              </span>
            );
          })
        }
      </div>
      <div className="mx_UserSettings_RoomTags_Buttons">
        <div onClick={this.addTag} className="mx_textButton">Add</div>
        {
            {modMenu}
        }
        {
          this.state.selectedTag !== null ? (
            <span>
              <div onClick={this.moveTagUp} className="mx_textButton">Move Up</div>
              <div onClick={this.moveTagDown} className="mx_textButton">Move Down</div>
            </span>
          ): null
        }
      </div>
    </div>);
  },
});
