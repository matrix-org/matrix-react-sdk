/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
import { mount } from "enzyme";

import DesktopBuildsNotice from "../../../../src/components/views/elements/DesktopBuildsNotice";
import { PosthogScreenTracker } from "../../../../src/PosthogTrackers";
import SearchBar, { SearchScope } from "../../../../src/components/views/rooms/SearchBar";
import { KeyBindingAction } from "../../../../src/accessibility/KeyboardShortcuts";

let mockCurrentEvent = KeyBindingAction.Enter;
let mockWarningKind = true;
let wrapper: any = null;

const searchProps = {
  onCancelClick: jest.fn(),
  onSearch: jest.fn(),
  searchInProgress: false,
  isRoomEncrypted: false
};

jest.mock("../../../../src/KeyBindingsManager", () => ({
  __esModule: true,
  getKeyBindingsManager: jest.fn(() => (
    { getAccessibilityAction: jest.fn(() => mockCurrentEvent) }))
}));

/** mock out DesktopBuildsNotice component so it doesn't affect the result of our test */
jest.mock('../../../../src/components/views/elements/DesktopBuildsNotice', () => ({
  __esModule: true,
  WarningKind: {
    get Search() {
      return mockWarningKind;
    }
  },
  default: jest.fn(({ children }) => (
    <div>{children}</div>
  )),
}));

/** mock out PosthogTrackers component so it doesn't affect the result of our test */
jest.mock('../../../../src/PosthogTrackers', () => ({
  __esModule: true,
  PosthogScreenTracker: jest.fn(({ children }) => (
    <div>{children}</div>
  )),
}));


describe("SearchBar", () => {
  beforeEach(() => {
    wrapper = mount(<SearchBar {...searchProps} />)
  });

  afterEach(() => {
    wrapper.unmount();
    searchProps.onCancelClick.mockClear();
    searchProps.onSearch.mockClear();
  });

  it("must render child components and pass necessary props", () => {
    const post_hog_screen_tracker = wrapper.find(PosthogScreenTracker);
    const desktop_build_notice = wrapper.find(DesktopBuildsNotice);

    expect(post_hog_screen_tracker.length).toBe(1);
    expect(desktop_build_notice.length).toBe(1);
    expect(post_hog_screen_tracker.props().screenName).toEqual("RoomSearch");
    expect(desktop_build_notice.props().isRoomEncrypted).toEqual(searchProps.isRoomEncrypted);
    expect(desktop_build_notice.props().kind).toEqual(mockWarningKind);
  });

  it("must not search when input value is empty", () => {
    const roomButtons = wrapper.find(".mx_SearchBar_button");
    const searchButton = wrapper.find(".mx_SearchBar_searchButton");

    expect(roomButtons.length).toEqual(4);

    searchButton.at(0).simulate("click");
    roomButtons.at(0).simulate("click");
    roomButtons.at(2).simulate("click");

    expect(searchProps.onSearch).not.toHaveBeenCalled();
  });

  it("must trigger onSearch when value is not empty", () => {
    const searchValue = "abcd";

    const roomButtons = wrapper.find(".mx_SearchBar_button");
    const searchButton = wrapper.find(".mx_SearchBar_searchButton");
    const input = wrapper.find(".mx_SearchBar_input input");
    input.instance().value = searchValue;

    expect(roomButtons.length).toEqual(4);

    searchButton.at(0).simulate("click");

    expect(searchProps.onSearch).toHaveBeenCalledTimes(1);
    expect(searchProps.onSearch).toHaveBeenNthCalledWith(1, searchValue, SearchScope.Room);

    roomButtons.at(0).simulate("click");

    expect(searchProps.onSearch).toHaveBeenCalledTimes(2);
    expect(searchProps.onSearch).toHaveBeenNthCalledWith(2, searchValue, SearchScope.Room);

    roomButtons.at(2).simulate("click");

    expect(searchProps.onSearch).toHaveBeenCalledTimes(3);
    expect(searchProps.onSearch).toHaveBeenNthCalledWith(3, searchValue, SearchScope.All);
  });

  it("cancel button and esc key should trigger onCancelClick", () => {

    mockCurrentEvent = KeyBindingAction.Escape;
    const cancelButton = wrapper.find(".mx_SearchBar_cancel");
    const input = wrapper.find(".mx_SearchBar_input input");
    input.simulate("focus");
    input.simulate("keydown", { key: "ESC" });
    cancelButton.at(0).simulate("click");

    expect(searchProps.onCancelClick).toHaveBeenCalledTimes(2);
  })
});