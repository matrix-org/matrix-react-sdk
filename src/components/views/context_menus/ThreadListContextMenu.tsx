import React, { useCallback, useRef, useState } from "react";
import { MatrixEvent } from "matrix-js-sdk/src";
import { ButtonEvent } from "../elements/AccessibleButton";
import dis from '../../../dispatcher/dispatcher';
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { copyPlaintext } from "../../../utils/strings";
import { ChevronFace, ContextMenuTooltipButton } from "../../structures/ContextMenu";
import { _t } from "../../../languageHandler";
import IconizedContextMenu, { IconizedContextMenuOption, IconizedContextMenuOptionList } from "./IconizedContextMenu";

interface IProps {
    mxEvent: MatrixEvent;
    permalinkCreator: RoomPermalinkCreator;
}

const contextMenuBelow = (elementRect: DOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset + elementRect.width;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return { left, top, chevronFace };
};

export const ThreadListContextMenu: React.FC<IProps> = ({ mxEvent, permalinkCreator }) => {
    const [optionsPosition, setOptionsPosition] = useState(null);
    const closeThreadOptions = useCallback(() => {
        setOptionsPosition(null);
    }, []);

    const viewInRoom = useCallback((evt: ButtonEvent): void => {
        evt.preventDefault();
        evt.stopPropagation();
        dis.dispatch({
            action: 'view_room',
            event_id: mxEvent.getId(),
            highlighted: true,
            room_id: mxEvent.getRoomId(),
        });
        closeThreadOptions();
    }, [mxEvent, closeThreadOptions]);

    const copyLinkToThread = useCallback(async (evt: ButtonEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
        const matrixToUrl = permalinkCreator.forEvent(mxEvent.getId());
        await copyPlaintext(matrixToUrl);
        closeThreadOptions();
    }, [mxEvent, closeThreadOptions, permalinkCreator]);

    const toggleOptionsMenu = useCallback((ev: ButtonEvent): void => {
        if (!!optionsPosition) {
            closeThreadOptions();
        } else {
            const position = ev.currentTarget.getBoundingClientRect();
            setOptionsPosition(position);
        }
    }, [closeThreadOptions, optionsPosition]);

    return <React.Fragment>
        <ContextMenuTooltipButton
            className="mx_MessageActionBar_maskButton mx_MessageActionBar_optionsButton"
            onClick={toggleOptionsMenu}
            title={_t("Thread options")}
            isExpanded={!!optionsPosition}
        />
        { !!optionsPosition && (<IconizedContextMenu
            onFinished={closeThreadOptions}
            className="mx_RoomTile_contextMenu"
            compact
            rightAligned
            {...contextMenuBelow(optionsPosition)}
        >
            <IconizedContextMenuOptionList>
                <IconizedContextMenuOption
                    onClick={(e) => viewInRoom(e)}
                    label={_t("View in room")}
                    iconClassName="mx_ThreadPanel_viewInRoom"
                />
                <IconizedContextMenuOption
                    onClick={(e) => copyLinkToThread(e)}
                    label={_t("Copy link to thread")}
                    iconClassName="mx_ThreadPanel_copyLinkToThread"
                />
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>) }
    </React.Fragment>;
};
