import React from 'react';
import { mount } from 'enzyme';

import SettingsStore from '../../../src/settings/SettingsStore';
import FeatureSettingWrapper from '../../../src/settings/helpers/FeatureSettingWrapper';
import { UIFeature } from '../../../src/settings/UIFeature';

jest.mock('../../../src/settings/SettingsStore');

describe('<FeatureSettingWrapper>', () => {
    const defaultProps = {
        feature: UIFeature.Flair,
        children: <div>test</div>,
        roomId: 'testabc',
    };
    const getComponent = (props = {}) => mount(<FeatureSettingWrapper {...defaultProps} {...props} />);

    beforeEach(() => {
        (SettingsStore.getValue as jest.Mock).mockClear().mockReturnValue(true);
    });

    it('renders children when setting is truthy', () => {
        const component = getComponent();

        expect(component).toMatchSnapshot();
        expect(SettingsStore.getValue).toHaveBeenCalledWith(defaultProps.feature, defaultProps.roomId);
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
