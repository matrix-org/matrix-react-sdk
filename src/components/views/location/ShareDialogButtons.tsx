
import React from 'react';
import AccessibleButton from '../elements/AccessibleButton';
import { Icon as BackIcon } from '../../../../res/img/element-icons/caret-left.svg';
import { Icon as CloseIcon } from '../../../../res/img/element-icons/cancel-rounded.svg';

interface Props {
    onCancel: () => void;
    onBack: () => void;
    displayBack?: boolean;
}

const ShareDialogButtons: React.FC<Props> = ({ onBack, onCancel, displayBack }) => {
    return <div className='mx_ShareDialogButtons'>
        {displayBack &&
            <AccessibleButton
                className="mx_ShareDialogButtons_button left"
                data-test-id='share-dialog-buttons-back'
                onClick={onBack}
                element='button'>
                <BackIcon className="mx_ShareDialogButtons_button-icon" />
            </AccessibleButton>}
        <AccessibleButton
            className="mx_ShareDialogButtons_button right"
            data-test-id='share-dialog-buttons-cancel'
            onClick={onCancel}
            element='button'
        ><CloseIcon className="mx_ShareDialogButtons_button-icon" /></AccessibleButton>
    </div>;
};

export default ShareDialogButtons;
