#!/usr/bin/env node
// const fs = require('fs');
const fs = require('fs/promises');
const path = require('path');

const TEMPLATES = {
    COMPONENT: `
import React from 'react';

interface Props {};

const %%ComponentName%%: React.FC<Props> = ({}) => {
    return <div className='mx_%%ComponentName%%' />
}

export default %%ComponentName%%;
`,
    TEST: `
`,
    STYLE: `
.mx_%%ComponentName%% {

}
`
}


const options = {
    alias: {
        filePath: 'f'
    }
}

const args = require('minimist')(process.argv, options);

const ensureDirectoryExists = async (filePath) => {
    const dirName = path.parse(filePath).dir;

    try {
        await fs.access(dirName);
        return;
    } catch (error) { }

    await fs.mkdir(dirName, { recursive: true })
}

const makeFile = async ({
    filePath, componentName, extension, base, template, prefix
}) => {
    const newFilePath = path.join(base, path.dirname(filePath), `${prefix || ''}${path.basename(filePath)}${extension}`)
    await ensureDirectoryExists(newFilePath);
    try {
        await fs.writeFile(newFilePath, template.replace(/%%ComponentName%%/g, componentName), { flag: 'wx' });
        console.log(`Created ${path.relative(process.cwd(), newFilePath)}`);
    } catch (error) {
        if (error.code === 'EEXIST') {
            console.log(`File already exists ${path.relative(process.cwd(), newFilePath)}`);
        } else {
            throw error;
        }
    }
}


const makeReactComponent = async () => {
    const { filePath } = args;

    if (!filePath) {
        throw new Error('No file path')
    }

    const componentName = filePath.split('/').slice(-1).pop();

    await makeFile({ filePath, componentName, base: 'src', extension: '.tsx', template: TEMPLATES.COMPONENT });
    await makeFile({ filePath, componentName, base: 'test', extension: '-test.tsx', template: TEMPLATES.TEST });
    await makeFile({ filePath, componentName, base: 'res/css', prefix: '_', extension: '.scss', template: TEMPLATES.STYLE });
}

// Wrapper since await at the top level is not well supported yet
function run() {
    (async function () {
        await makeReactComponent();
    })();
}

run();
return;

