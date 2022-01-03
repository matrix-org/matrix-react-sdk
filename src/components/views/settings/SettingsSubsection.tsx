/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode, HTMLAttributes } from 'react';
import classNames from 'classnames';

import Heading from '../typography/Heading';

interface Props extends HTMLAttributes<HTMLFieldSetElement | HTMLDivElement> {
    // section title
    title: string | ReactNode;
    isFieldset?: boolean;
    description?: string | ReactNode;
}

const Title: React.FC<{ isFieldset: boolean }> = ({ isFieldset, children }) =>
    isFieldset ?
        <legend className='mx_SettingsSubsection_title'>{ children }</legend> :
        <Heading className='mx_SettingsSubsection_title' size='h3'>{ children }</Heading>;

const SettingsSubsection: React.FC<Props> = ({ title, isFieldset, className, children, description, ...rest }) => {
    const Container = isFieldset ? 'fieldset' : 'div';

    return (<Container {...rest} className={classNames('mx_SettingsSubsection', className)}>
        <Title isFieldset={isFieldset}>{ title }</Title>
        { description && <div className='mx_SettingsSubsection_description'>{ description }</div> }
        { children }
    </Container>);
};

export default SettingsSubsection;
