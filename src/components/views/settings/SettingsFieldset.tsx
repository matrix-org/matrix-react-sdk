import classNames from 'classnames';
import React, { ReactNode, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLFieldSetElement> {
    // section title
    legend: string | ReactNode;
    description?: string | ReactNode;
}

const SettingsFieldset: React.FC<Props> = ({ legend, className, children, description, ...rest }) =>
    <fieldset {...rest} className={classNames('mx_SettingsFieldset', className)}>
        <legend className='mx_SettingsFieldset_legend'>{ legend }</legend>
        { description && <div className='mx_SettingsFieldset_description'>{ description }</div> }
        { children }
    </fieldset>;

export default SettingsFieldset;
