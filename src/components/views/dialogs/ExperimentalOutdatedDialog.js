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
        _t("Thanks for taking an interest in trying our experimental build! We don't have anything " +
            "highly experimental going on right now, and we have already merged what we are working on into " +
            "the development build. Click the button below to try out our development build, or visit " +
            "us in #riot-web:matrix.org for more information.");

    const redirect = () => {
        window.location = "/develop";
    };

    return (<QuestionDialog
        hasCancelButton={false}
        title={_t("Experimental is outdated")}
        description={<div>{description}</div>}
        button={_t("Try development build")}
        onFinished={redirect}
    />);
};
