
import React, { SyntheticEvent, useContext } from 'react';
import { Room } from 'matrix-js-sdk';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import ContextMenu, { AboveLeftOf } from '../../structures/ContextMenu';
import LocationPicker, { ILocationPickerProps } from "./LocationPicker";
import { shareLocation } from './shareLocation';

type Props = Omit<ILocationPickerProps, 'onChoose'> & {
    onFinished: (ev?: SyntheticEvent) => void;
    menuPosition: AboveLeftOf;
    openMenu: () => void;
    roomId: Room["roomId"];
};

const LocationShareMenu: React.FC<Props> = ({
    menuPosition, onFinished, sender, roomId, openMenu,
}) => {
    const matrixClient = useContext(MatrixClientContext);

    return <ContextMenu
        {...menuPosition}
        onFinished={onFinished}
        managed={false}
    >
        <div className="mx_LocationShareMenu">
            <LocationPicker
                sender={sender}
                onChoose={shareLocation(matrixClient, roomId, openMenu)}
                onFinished={onFinished}
            />
        </div>
    </ContextMenu>;
};

export default LocationShareMenu;
