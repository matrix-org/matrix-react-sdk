/*
Copyright 2018 New Vector Ltd

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

import React from 'react';
import QuestionDialog from './QuestionDialog';
import { _t } from '../../../languageHandler';

export default (props) => {
    const description =
        _t("You have used a more recent version of Riot on this domain that upgraded your local cache to a newer format I can't read. Would you like me to either ignore the cache (which might make Riot slower) or remove the cache and sync with the server again?");

    return (<QuestionDialog
        hasCancelButton={false}
        title={_t(`Local cache incompatible with Riot ${appVersion}`)}
        description={<div>{description}</div>}
        button={_t("Clear cache and resync")}
        cancelButton={_t("Ignore cache")}
        onFinished={props.onFinished}
    />);
};
