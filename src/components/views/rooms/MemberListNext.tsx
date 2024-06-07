/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { Form, IconButton, Search, Separator, Text } from "@vector-im/compound-web";
import { Icon as InviteIcon } from "@vector-im/compound-design-tokens/icons/user-add-solid.svg";
import React, { useEffect, useRef, useState } from "react";
import { Flex } from "../../utils/Flex";
import { List, ListRowProps } from "react-virtualized/dist/commonjs/List";
import { useMemberListViewModel } from "../../../view-models/rooms/memberlist/MemberListViewModelNext";

interface IProps {
    roomId: string;
}

const MemberListNext: React.FC<IProps> = (props: IProps) => {
    const viewModel = useMemberListViewModel(props.roomId);
    const [listWidth, setListWidth] = useState(100);
    const [listHeight, setListHeight] = useState(100);
    const listParent = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((event) => {
            // Depending on the layout, you may need to swap inlineSize with blockSize
            // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentBoxSize
            setListWidth(event[0].contentBoxSize[0].inlineSize);
            setListHeight(event[0].contentBoxSize[0].blockSize);
        });

        if (listParent.current) {
            resizeObserver.observe(listParent.current);
        }
    }, [listParent]);

    function rowRenderer({ key, index, style }: ListRowProps) {
        const member = viewModel.members[index];
        return (
            <div key={key} style={style}>
                {member.name}
            </div>
        );
    }

    return (
        <Flex align="stretch" direction="column" className="mx_MemberList_container">
            <Form.Root>
                <Flex
                    as="header"
                    className="mx_RoomSummaryCard_header"
                    gap="var(--cpd-space-3x)"
                    align="center"
                    justify="space-between"
                >
                    <Search
                        name="searchMembers"
                        placeholder="Search People..."
                        onChange={(e) =>
                            viewModel.onSearchQueryChanged((e as React.ChangeEvent<HTMLInputElement>).target.value)
                        }
                    />
                    <IconButton
                        type="button"
                        onClick={function Qa() {
                            console.log("do nada");
                        }}
                        size="32px"
                    >
                        <InviteIcon />
                    </IconButton>
                </Flex>
            </Form.Root>
            <Text
                as="div"
                size="sm"
                weight="semibold"
                className="mx_RoomSummaryCard_alias text-secondary"
                // title={alias}
            >
                {`${viewModel.members.length} Members`}
            </Text>
            <Separator />
            <div ref={listParent} className="mx_MemberList_container">
                <List
                    rowRenderer={rowRenderer}
                    rowHeight={50}
                    rowCount={viewModel.members.length}
                    height={listHeight}
                    width={listWidth}
                />
            </div>
        </Flex>
    );
};

export default MemberListNext;
