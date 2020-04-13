import React from 'react'
import * as sdk from '../../../index'
import PropTypes from 'prop-types'
import classNames from 'classnames';

export default class VoiceUserTile extends React.Component {

    constructor (props) {
        super(props)

        this.state = {}
    }


    render = () => {
        const BaseAvatar = sdk.getComponent('avatars.BaseAvatar')
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton')

        
        const buttonClasses = classNames({
            'mx_VoiceTile': true,
        })
        const labelClasses = classNames({
            'mx_VoiceTile_name': true
        })
        const avatarClasses = classNames({
            'mx_VoiceTile_avatar': true
        })

        const {user, ...otherProps} = this.props

        return <div>
                <AccessibleButton
                    className={buttonClasses}
                    onClick={() => {}}
                >
                    <div className={avatarClasses}>
                        <div className='mx_VoiceTile_avatar_container'>
                            <BaseAvatar 
                                {...otherProps}
                                name={user.displayName}
                                idName={user.userId}
                                url={user.avatarUrl}
                            />
                        </div>
                    </div>
                    <div className='mx_VoiceTile_nameContainer'>
                        <div className='mx_VoiceTile_labelContainer'>
                            <div title={user.displayName} className={labelClasses} tabIndex={-1} dir='auto'>{ user.displayName }</div>
                        </div>
                    </div>
                </AccessibleButton>
            </div>
    }

}

VoiceUserTile.propTypes = {
    user: PropTypes.object.isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    resizeMethod: PropTypes.string
}

VoiceUserTile.defaultProps = {
    width: 24,
    height: 24,
    resizeMethod: 'crop'
}