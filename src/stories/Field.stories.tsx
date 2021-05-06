import React from 'react';
import { Story, Meta } from '@storybook/react';

import Field, { IProps } from '../components/views/elements/Field';

export default {
    title: 'Example/Field',
    component: Field,
    argTypes: {
        // backgroundColor: { control: 'color' },
    },
} as Meta;

const Template: Story<IProps> = (args) => <Field
    value="Test Field"
    {...args}
/>;

export const Primary = Template.bind({});
Primary.args = {
    primary: true,
    label: 'Button',
};

export const Secondary = Template.bind({});
Secondary.args = {
    label: 'Button',
};

export const Large = Template.bind({});
Large.args = {
    size: 'large',
    label: 'Button',
};

export const Small = Template.bind({});
Small.args = {
    size: 'small',
    label: 'Button',
};
