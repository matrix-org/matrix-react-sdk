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
const NAMESPACES = ["org.matrix", "im.vector", "m"];
const STATIC_TAGS = [
  {
     name: "Invites",
     alias: "im.vector.fake.invite",
     protected: true,
     order: "manual",
     start_hidden: true,
     list_modifiable: true,
  },
  {
     name: "Favourites",
     alias: "m.favourite",
     verb: "favourite",
     protected: true,
     order: "manual",
     start_hidden: false,
     list_modifiable: true,
  },
  {
     name: "Rooms",
     verb: "restore",
     alias: "im.vector.fake.recent",
     protected: true,
     order: "recent",
     start_hidden: false,
     list_modifiable: false,
  },
  {
     name: "People",
     alias: "im.vector.fake.direct",
     protected: true,
     order: "recent",
     start_hidden: true,
     list_modifiable: false,
  },
  {
     name: "Historical",
     alias: "im.vector.fake.archived",
     protected: true,
     order: "recent",
     start_hidden: false,
     list_modifiable: false,
  },
  {
     name: "Low Priority",
     alias: "m.lowpriority",
     verb: "demote",
     order: "recent",
     protected: true,
     start_hidden: false,
  },
];
const ROOM_ORDERING = ["recent", "manual"];

class RoomTagUtil {
  /**
   * getRoomTags - Get the avaliable tags that the user has defined
   *  or has been hardcoded.
   * In the format:
   * {
   *  alias: "m.tagname",  The tag itself (if left empty, assume name)
   *  name: "Tag Name", The tag label to display.
   *  protected: false, Can this tag be deleted or modified.
   *  show_unused: true, Show the tag in the list if unused.
   *  list_modifiable: true Can rooms be added to the list. Used for fake tags.
   * }
   * @return {object[]} A list of tags.
   */
  getTags() {
    const tags = UserSettingsStore.getSyncedSetting(SETTING_NAME, []);
    // Remove static tags.
    STATIC_TAGS.forEach( (staticTag) => {
      const index = tags.findIndex((tag) => {return tag.alias === staticTag.alias;});
      if (index !== -1) {
        tags.splice(index, 1, staticTag);
        console.warn(
          `Replacing tag '${staticTag.alias}' because it clashes with an internal static tag.`,
        );
      }
    });

    return STATIC_TAGS.concat(tags);
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
    tags[tagIndex+direction] = tags[tagIndex];
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

  addTag(text, order = "recent") {
    const result = this.isTagValid(text);
    if (result.valid === false) {
      throw new Error(result.error);
    }
    const tags = this.getTags();
    tags.push({name: text, order});
    UserSettingsStore.setSyncedSetting(SETTING_NAME, tags);
    return tags;
  }

  modifyTagRoomOrder(tagIndex, order) {
    if (!ROOM_ORDERING.has(order)) {
      throw new Error("Invalid room ordering type.");
    }
    const tags = this.getTags();
    if (tagIndex < 0 || tagIndex >= tags.length) {
      throw new Error("Tag index out of range.");
    }
    if (tags[tagIndex].protected) {
      throw new Error("Can't modify protected tags.");
    }
    tags[tagIndex].order = order;
    UserSettingsStore.setSyncedSetting(SETTING_NAME, tags);
  }

  deleteTag(tagIndex) {
    const tags = this.getTags();
    if (tagIndex < 0 || tagIndex >= tags.length) {
      throw new Error("Tag index out of range.");
    }
    if (tags[tagIndex].protected) {
      throw new Error("Can't delete protected tags.");
    }
    tags.splice(tagIndex, 1);
    UserSettingsStore.setSyncedSetting(SETTING_NAME, tags);
    return tags;
  }
}

module.exports = new RoomTagUtil();
