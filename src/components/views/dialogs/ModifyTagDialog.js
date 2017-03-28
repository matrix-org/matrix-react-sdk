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

const ROOM_ORDERS = ["recent", "manual"];
export default React.createClass({
    displayName: 'ModifyTagDialog',
    propTypes: {
        tag: React.PropTypes.object,
        focus: React.PropTypes.bool,
        onFinished: React.PropTypes.func.isRequired,
    },

    onOK: function() {
        // Validate
        this.props.onFinished(true, this.state.tag);
    },

    getInitialState: function() {
      if (this.props.tag) {
        return {tag: this.props.tag, new: false};
      } else {
        return {tag: {
          name: "New Tag",
          order: "recent",
        }, new: true };
      }
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        let title;
        let description;
        let button;
        if (!this.state.new) {
          title = `Modifying '${this.state.tag.name}'.`;
          description = "";
          button = "Modify tag";
        } else {
          title = "Add a new tag.";
          description = "Create a new tag for ordering rooms.";
          button = "Add tag";
        }
        return (
            <BaseDialog className="mx_ModifyTagDialog" onFinished={this.props.onFinished}
              onEnterPressed={ this.onOk }
              title={title}
            >
              <form onSubmit={this.onSubmit}>
                  <div className="mx_Dialog_content">
                      <p>{description}</p>
                      <label for="tag_name">Tag Name</label>
                      <input type="text" name="tag_name" ref="tag_name" value={this.state.tag.name}
                          autoFocus={true} onChange={this.onValueChange} size="30"
                      />
                      <label for="tag_order">Room Ordering</label>
                      <select name="tag_order" ref="tag_order" value={this.state.tag.order} disabled={this.state.tag.protected === true}>
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
