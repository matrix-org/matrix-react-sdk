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
const UserSettingsStore = require('./UserSettingsStore');

const SETTING_NAME = "org.matrix.room_tags";
const NAMESPACES = ["org.matrix", "im.vector"];

class RoomTagUtil {
  /**
   * getRoomTags - Get the avaliable tags that the user has defined
   *  or has been hardcoded.
   * In the format:
   * {
   *  label: "Tag Name" // The tag label to display,
   *  tag: "m.atagname"  // The tag itself,
   *  protected: false //Can this tag be deleted.
   * }
   * @return {object[]} A list of tags.
   */
  getTags() {
    const tags = UserSettingsStore.getSyncedSetting(SETTING_NAME, []);
    // Check for missing m.favourite
    if (tags.find((tag) => {return tag.tag == "m.favourite";} ) === null) {
      tags.push({ label: "Favourites", tag: "m.favourite", protected: true });
    }

    // Check for missing m.lowpriority
    if (tags.find((tag) => {return tag.tag == "m.lowpriority";} ) === null) {
      tags.push({ label: "Low Priority", tag: "m.lowpriority", protected: true });
    }
    return tags;
  }

  /**
   * moveTag - Move a tags order (such as in the room list).
   * @param  {number} tagIndex  Index of the tag to move.
   * @param  {number} direction Direction to move the tag in. Negative for up and positive for down.
   */
  moveTag(tagIndex, direction) {
    const tags = this.getTags();
    if (direction === 0 ||
      tagIndex+direction >= tags.length ||
      tagIndex+direction < 0
      ) {
      throw new Error("Cannot move tag this far.");
    }
    const otherTag = tags[tagIndex+direction];
    tags[tagIndex+direction] = this.state.tags[this.state.selectedTag];
    tags[tagIndex] = otherTag;
    UserSettingsStore.setSyncedSetting(SETTING_NAME, tags);
    return tags;
  }

  /**
   * isTagValid - Check to see if a tag text is valid.
   * A tag may be found invalid if it already exists, or clashes with a namespace.
   * The return object type is {valid: boolean, error: string}
   * @param  {string} text Tag text
   * @return {object} Object containing a valid flag, and an error message on invalid tags.
   */
  isTagValid(text) {
    const tags = this.getTags();
    text = text.toLowerCase();
    if (NAMESPACES.some((ns) => { return text.startsWith(ns); })) {
      return {valid: false, error: "This tag cannot clash with this namespace."};
    }
    if (
      tags.find(
        (tag) => {
          text = text.toLowerCase();
          return tag.tag.toLowerCase() === text || tag.label.toLowerCase() === text;
        })
      ) {
      return {valid: false, error: "This tag already exists!"};
    } else {
      return {valid: true};
    }
  }

  addTag(text) {
    if (this.isTagValid(text).valid === false) {
      throw new Error("Tag is not valid.");
    }
    const tags = this.getTags();
    tags.push({tag: text});
    UserSettingsStore.setSyncedSetting(SETTING_NAME, tags);
    return tags;
  }

  deleteTag(tagIndex) {
    const tags = this.getTags();
    if (tagIndex < 0 || tagIndex >= tags.length) {
      throw new Error("Tag index out of range.");
    }
    const tag = tags[tagIndex];
    if (tag.protected) {
      throw new Error("Can't delete protected tags.");
    }
    tags.splice(tagIndex, 1);
  }
}

module.exports = new RoomTagUtil();
