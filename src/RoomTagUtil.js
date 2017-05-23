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

const NAMESPACES = ["org.matrix", "im.vector", "m."];
// Order is important here.
/*
* Tags are given in the format:
* {
*  alias: The tag itself (if left empty, assume name)
*  name: The tag label to display.
*  verb: Text to display when describing an action on the tag.
         E.g. "Drag to ${verb} room."
*  modifiable: true, Can this tag be modified.
*  deletable: true, Can this tag be deleted.
*  order: The ordering method to use. Can be 'manual' or 'recent'.
*  start_hidden: Hide the contents by default.
*  show_header: Show header, even if it does not have any rooms.
*  list_modifiable: true Can rooms be added to the list. Used for fake tags.
*  conflicts_with: Tag names/aliases that it conflicts with.
* }
*/
const STATIC_TAGS = [
  {
     name: "Invites",
     alias: "im.vector.fake.invite",
     modifiable: false,
     deletable: false,
     order: "recent",
     start_hidden: true,
     list_modifiable: false,
     show_header: false,
  },
  {
     name: "Favourites",
     alias: "m.favourite",
     verb: "favourite",
     modifiable: true,
     deletable: false,
     order: "manual",
     start_hidden: false,
     show_header: true,
     list_modifiable: true,
     conflicts_with: ["m.lowpriority"],
  },
  {
     name: "Rooms",
     verb: "restore",
     alias: "im.vector.fake.recent",
     modifiable: true,
     deletable: false,
     order: "recent",
     start_hidden: false,
     show_header: true,
     list_modifiable: false,
  },
  {
     name: "People",
     alias: "im.vector.fake.direct",
     verb: "tag direct chat",
     modifiable: true,
     deletable: false,
     order: "recent",
     start_hidden: true,
     show_header: true,
     list_modifiable: false,
  },
  {
     name: "Low Priority",
     alias: "m.lowpriority",
     verb: "demote",
     order: "recent",
     modifiable: true,
     deletable: false,
     start_hidden: true,
     show_header: true,
     list_modifiable: true,
     conflicts_with: ["m.favourite"],
  },
  {
     name: "Historical",
     alias: "im.vector.fake.archived",
     modifiable: false,
     deletable: false,
     order: "recent",
     start_hidden: true,
     show_header: true,
     list_modifiable: false,
  },
];
const ROOM_ORDERING = ["recent", "manual"];

class RoomTagUtil {
  _tags = null;

  _loadTags() {
    const tags = UserSettingsStore.getCustomTags();
    // Remove static tags.
    STATIC_TAGS.forEach( (staticTag) => {
      const index = tags.findIndex((tag) => {return tag.alias === staticTag.alias;});
      if (index === -1) {
        tags.push(staticTag);
      } else if(!staticTag.modifiable) {
        tags.splice(index, 1, staticTag);
      }
    });
    return tags;
  }

  /**
   * tags - Get the avaliable tags that the user has defined
   * or has been built into the SDK.
   * @return {object[]} A list of tags.
   */
  get tags() {
    if(this._tags === null) {
      this._tags = this._loadTags();
    }
    return this._tags;
  }

  getTag(tagName) {
    if(tagName === undefined) {
      return undefined;
    }
    return this._tags.find((tag) => {
      return tag.alias == tagName || tag.name == tagName;
    });
  }


  /**
   * get tagDefaults - Get the default options for a tag.
   * @return {object}  Tag defaults.
   */
  get tagDefaults() {
    return {
      modifiable: true,
      deletable: true,
      order: "manual",
      start_hidden: false,
      show_header: false,
      list_modifiable: true,
      conflicts_with: [],
    };
  }

  /**
   * moveTag - Move a tags order (such as in the room list).
   * @param  {number} tagIndex  Index of the tag to move.
   * @param  {number} direction Direction to move the tag in. Negative for up and positive for down.
   */
  moveTag(tagIndex, direction) {
    if (direction === 0 ||
      tagIndex+direction >= this._tags.length ||
      tagIndex+direction < 0
      ) {
      throw new Error("Cannot move tag.");
    }
    const otherTag = this._tags[tagIndex+direction];
    this._tags[tagIndex+direction] = this._tags[tagIndex];
    this._tags[tagIndex] = otherTag;
    this.saveTags();
  }

  /**
   * isTagTextValid - Check to see if a tag text is valid.
   * A tag may be found invalid if it already exists, or clashes with a namespace.
   * The return object type is {valid: boolean, error: string}
   * @param  {string} text Tag text
   * @param  {number} ignoreIndex index to ignore when checking for name clashes
   * @return {object} Object containing a valid flag, and an error message on invalid tags.
   */
  isTagTextValid(text, ignoreIndex = -1) {
    text = text.toLowerCase();
    if (NAMESPACES.some((ns) => { return text.startsWith(ns); })) {
      return {valid: false, error: "This tag cannot clash with this namespace."};
    }
    if (
      this._tags.find(
        (tag, index) => {
          if(ignoreIndex == index) {
            return false;
          }
          if (typeof tag.alias === "string") {
            if (tag.alias.toLowerCase() === text) {
              return true;
            }
          }
          return tag.name.toLowerCase() === text;
        })
      ) {
      return {valid: false, error: "This tag already exists!"};
    } else {
      return {valid: true};
    }
  }

  addTag(index, name, order = "recent") {
    const result = this.isTagTextValid(name);
    if (result.valid === false) {
      throw new Error(result.error);
    }
    const tag = this.tagDefaults;
    tag.name = name;
    tag.order = order;
    this._tags.splice(index, 0, tag);
    this.saveTags();
  }

  modifyTag(index, name, order) {
    const result = this.isTagTextValid(name, index);
    if (result.valid === false) {
      throw new Error(result.error);
    }
    this._tags[index] = {name, order};
    this.saveTags();
  }

  modifyTagRoomOrder(tagIndex, order) {
    if (!ROOM_ORDERING.has(order)) {
      throw new Error("Invalid room ordering type.");
    }
    if (tagIndex < 0 || tagIndex >= this._tags.length) {
      throw new Error("Tag index out of range.");
    }
    if (this._tags[tagIndex].protected) {
      throw new Error("Can't modify protected tags.");
    }
    this._tags[tagIndex].order = order;
    this.saveTags();
  }

  deleteTag(tagIndex) {
    if (tagIndex < 0 || tagIndex >= this._tags.length) {
      throw new Error("Tag index out of range.");
    }
    if (this._tags[tagIndex].protected) {
      throw new Error("Can't delete protected tags.");
    }
    this._tags.splice(tagIndex, 1);
    this.saveTags();
  }

  saveTags() {
    UserSettingsStore.setCustomTags(this._tags);
  }
}

module.exports = new RoomTagUtil();
