import classNames from 'classnames';
import React from 'react';
import { _t } from '../../../languageHandler';
import { aboveLeftOf, ContextMenu, ContextMenuTooltipButton, useContextMenu } from '../../structures/ContextMenu';
import { Gif } from '../gifpicker/Gif';
import GifPicker from '../gifpicker/GifPicker';

const GifButton = ({ addGif }) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();

        const onAddGif = (gif: Gif) => {
            closeMenu();
            addGif(gif);
        };

        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu}>
            <GifPicker addGif={onAddGif} />
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
        />

        { contextMenu }
    </>;
};

export default GifButton;
