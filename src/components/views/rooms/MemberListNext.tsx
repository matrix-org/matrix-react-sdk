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
import React from "react";
import { Flex } from "../../utils/Flex";

interface IProps {
    roomId: string;
}

const MemberListNext: React.FC<IProps> = (propsIn: IProps) => {
    return (
        <Form.Root>
            <Flex
                as="header"
                className="mx_RoomSummaryCard_header"
                gap="var(--cpd-space-3x)"
                align="center"
                justify="space-between"
            >
                <Search name="searchMembers" placeholder="Search People..." onChange={() => console.log("hello")} />
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
            <Text
                as="div"
                size="sm"
                weight="semibold"
                className="mx_RoomSummaryCard_alias text-secondary"
                // title={alias}
            >
                Members
            </Text>
            <Separator />
        </Form.Root>
    );
};

export default MemberListNext;
