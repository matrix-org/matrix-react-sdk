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

import React from 'react';
import sdk from '../../../index';
import RoomTagUtil from '../../../RoomTagUtil';

const ROOM_ORDERS = ["recent", "manual"];
export default React.createClass({
    displayName: 'ModifyTagDialog',
    propTypes: {
        tag: React.PropTypes.object,
        focus: React.PropTypes.bool,
        onFinished: React.PropTypes.func.isRequired,
    },

    onOK: function() {
      const hasError = this.state.tagError === "";
      this.props.onFinished(hasError, {
        name: this.state.tagName,
        order: this.state.tagOrder,
      });
    },

    getInitialState: function() {
      // Are we modifying or creating a new tag.
      if (this.props.tag) {
        return {
          tagName: this.props.tag.name,
          tagOrder: this.props.tag.order,
          new: false,
          tagError: "",
        };
      } else {
        return {
          name: "New Tag",
          order: "recent",
          new: true,
          tagError: "",
        };
      }
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    onNameChange: function(event) {
      const valid = RoomTagUtil.isTagTextValid(event.target.value);
      // Make sure we're not checking against itself.
      if( valid.valid || (!this.state.new && name === this.getInitialState().tagName) ) {
        this.setState({tagName: event.target.value, tagError: ""});
      } else {
        this.setState({tagError: valid.error});
      }
    },

    onOrderChange: function(event) {
      this.setState({tagOrder: event.target.value});
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        let title;
        let description;
        let button;
        if (this.state.new) {
          title = "Add a new tag.";
          description = "Create a new tag for ordering rooms.";
          button = "Add tag";
        } else {
          title = `Modifying '${this.props.tag.name}'.`;
          description = "Modify an existing tag for ordering rooms.";
          button = "Modify tag";
        }
        return (
            <BaseDialog className="mx_ModifyTagDialog" onFinished={this.props.onFinished}
              onEnterPressed={ this.onOk }
              title={title}
            >
              <form onSubmit={this.onSubmit}>
                  <div className="mx_Dialog_content">
                      <p>{description}</p>
                      <p className="mx_TextInputDialog_validateMsg">{this.state.tagError}</p>
                      <label htmlFor="tag_name">Tag Name</label>
                      <input type="text" name="tag_name" ref="tag_name" defaultValue={this.state.tagName}
                          autoFocus={true} onChange={this.onNameChange} size="30"
                      />
                      <label htmlFor="tag_order">Room Ordering</label>
                      <select onChange={this.onOrderChange} name="tag_order" ref="tag_order" defaultValue={this.state.tagOrder}>
                      {
                        ROOM_ORDERS.map((order) => {
                          return (
                            <option key={order} value={order}>{order}</option>
                          );
                        })
                      }
                      </select>
                  </div>
              </form>
              <div className="mx_Dialog_buttons">
                  <button className="mx_Dialog_primary" onClick={this.onOK} autoFocus={this.props.focus}>
                      {button}
                  </button>
                  <button onClick={this.onCancel}>
                      Cancel
                  </button>
              </div>
            </BaseDialog>
        );
    },
});
