import React from 'react';
import { mount } from 'enzyme';

import SettingsStore from '../../../../src/settings/SettingsStore';
import UiFeatureSettingWrapper from '../../../../src/components/views/settings/UiFeatureSettingWrapper';
import { UIFeature } from '../../../../src/settings/UIFeature';

jest.mock('../../../../src/settings/SettingsStore');

describe('<UiFeatureSettingWrapper>', () => {
    const defaultProps = {
        uiFeature: UIFeature.Flair,
        children: <div>test</div>,
        roomId: 'testabc',
    };
    const getComponent = (props = {}) => mount(<UiFeatureSettingWrapper {...defaultProps} {...props} />);

    beforeEach(() => {
        (SettingsStore.getValue as jest.Mock).mockClear().mockReturnValue(true);
    });

    it('renders children when setting is truthy', () => {
        const component = getComponent();

        expect(component).toMatchSnapshot();
        expect(SettingsStore.getValue).toHaveBeenCalledWith(defaultProps.uiFeature, defaultProps.roomId);
    });

    it('returns null when setting is truthy but children are undefined', () => {
        const component = getComponent({ children: undefined });

        expect(component.html()).toBeNull();
    });

    it('returns null when setting is falsy', () => {
        (SettingsStore.getValue as jest.Mock).mockReturnValue(false);
        const component = getComponent();

        expect(component.html()).toBeNull();
    });
});
