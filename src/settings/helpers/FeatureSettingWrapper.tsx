import React from 'react';

import SettingsStore from '../SettingsStore';
import { UIFeature } from '../UIFeature';

interface Props {
    feature: UIFeature;
    roomId?: string;
}
const FeatureSettingWrapper: React.FC<Props> = ({ children, feature, roomId }) => {
    const settingValue = SettingsStore.getValue(feature, roomId);
    return settingValue && children ? <>{ children }</> : null;
};

export default FeatureSettingWrapper;
