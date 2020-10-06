
import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';
import classNames from 'classnames';


interface IProps {
    vertical?: boolean;
    reverse?: boolean;
    id?: string;
}

//see src/resizer for the actual resizing code, this is just the DOM for the resize handle
export default function ResizeHandle (props: IProps) {
    const allClassNames = classNames('mx_ResizeHandle', {
        'mx_ResizeHandle_vertical': props.vertical,
        'mx_ResizeHandle_horizontal': !props.vertical,
        'mx_ResizeHandle_reverse': props.reverse
    });

    return (
        <div className={allClassNames} data-id={props.id}><div /></div>
    );
};

ResizeHandle.propTypes = {
    vertical: PropTypes.bool,
    reverse: PropTypes.bool,
    id: PropTypes.string,
};
