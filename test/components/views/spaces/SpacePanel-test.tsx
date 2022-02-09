
import React from 'react';
import { mount } from 'enzyme';
import { mocked } from 'jest-mock';
import { MatrixClient } from 'matrix-js-sdk';
import { act } from "react-dom/test-utils";

import '../../../skinned-sdk';
import SpacePanel from '../../../../src/components/views/spaces/SpacePanel';
import { MatrixClientPeg } from '../../../../src/MatrixClientPeg';
import { SpaceKey } from '../../../../src/stores/spaces';
import { findByTestId } from '../../../utils/test-utils';
import { shouldShowComponent } from '../../../../src/customisations/helpers/UIComponents';
import { UIComponent } from '../../../../src/settings/UIFeature';

jest.mock('../../../../src/stores/spaces/SpaceStore', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const EventEmitter = require("events");
    class MockSpaceStore extends EventEmitter {
        invitedSpaces = [];
        enabledMetaSpaces = [];
        spacePanelSpaces = [];
        activeSpace: SpaceKey = '!space1';
    }
    return {
        instance: new MockSpaceStore(),
    };
});

jest.mock('../../../../src/customisations/helpers/UIComponents', () => ({
    shouldShowComponent: jest.fn(),
}));

describe('<SpacePanel />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<SpacePanel {...defaultProps} {...props} />);

    const mockClient = {
        getUserId: jest.fn().mockReturnValue('@test:test'),
        isGuest: jest.fn(),
        getAccountData: jest.fn(),
    } as unknown as MatrixClient;

    beforeAll(() => {
        jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(mockClient);
    });

    beforeEach(() => {
        mocked(shouldShowComponent).mockClear().mockReturnValue(true);
    });

    describe('create new space button', () => {
        it('renders create space button when UIComponent.CreateSpaces component should be shown', () => {
            const component = getComponent();
            expect(findByTestId(component, 'create-space-button').length).toBeTruthy();
        });

        it('does not render create space button when UIComponent.CreateSpaces component should not be shown', () => {
            mocked(shouldShowComponent).mockReturnValue(false);
            const component = getComponent();
            expect(shouldShowComponent).toHaveBeenCalledWith(UIComponent.CreateSpaces);
            expect(findByTestId(component, 'create-space-button').length).toBeFalsy();
        });

        it('opens context menu on create space button click', async () => {
            const component = getComponent();

            await act(async () => {
                findByTestId(component, 'create-space-button').at(0).simulate('click');
                component.setProps({});
            });

            expect(component.find('SpaceCreateMenu').length).toBeTruthy();
        });
    });
});
