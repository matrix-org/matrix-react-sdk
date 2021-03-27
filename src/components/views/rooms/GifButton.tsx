import classNames from 'classnames';
import React from 'react';
import { _t } from '../../../languageHandler';
import { aboveLeftOf, ContextMenu, ContextMenuTooltipButton, useContextMenu } from '../../structures/ContextMenu';
import GifPicker from '../gifpicker/GifPicker';

const GifButton = ({addGif}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu} catchTab={false}>
            <GifPicker addGif={addGif} />
        </ContextMenu>;
    }

    const className = classNames(
        "mx_MessageComposer_button",
        "mx_MessageComposer_gifButton",
        {
            "mx_MessageComposer_button_highlight": menuDisplayed,
        },
    );

    return <>
        <ContextMenuTooltipButton
            className={className}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            title={_t('GIF picker')}
            inputRef={button}
        >

        </ContextMenuTooltipButton>

        { contextMenu }
    </>;
};

export default GifButton;