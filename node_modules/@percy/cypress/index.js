const utils = require('@percy/sdk-utils');

// Collect client and environment information
const sdkPkg = require('./package.json');
const CLIENT_INFO = `${sdkPkg.name}/${sdkPkg.version}`;
const ENV_INFO = `cypress/${Cypress.version}`;
// asset discovery should timeout before this
// 1.5 times the 30 second nav timeout
const CY_TIMEOUT = 30 * 1000 * 1.5;

// Maybe set the CLI API address from the environment
utils.percy.address = Cypress.env('PERCY_SERVER_ADDRESS');

// Use Cypress's http:request backend task
utils.request.fetch = async function fetch(url, options) {
  options = { url, retryOnNetworkFailure: false, ...options };
  return Cypress.backend('http:request', options);
};

// Create Cypress log messages
function cylog(message, meta) {
  Cypress.log({
    name: 'percySnapshot',
    displayName: 'percy',
    consoleProps: () => meta,
    message
  });
}

// Take a DOM snapshot and post it to the snapshot endpoint
Cypress.Commands.add('percySnapshot', (name, options) => {
  let log = utils.logger('cypress');

  // Default name to test title
  name = name || cy.state('runnable').fullTitle();

  return cy.then({ timeout: CY_TIMEOUT }, async () => {
    if (Cypress.config('isInteractive') &&
        !Cypress.config('enablePercyInteractiveMode')) {
      return cylog('Disabled in interactive mode', {
        details: 'use "cypress run" instead of "cypress open"',
        name
      });
    }

    // Check if Percy is enabled
    if (!await utils.isPercyEnabled()) {
      return cylog('Not running', { name });
    }

    // Inject @percy/dom
    if (!window.PercyDOM) {
      // eslint-disable-next-line no-eval
      eval(await utils.fetchPercyDOM());
    }

    // Serialize and capture the DOM
    return cy.document({ log: false }).then({ timeout: CY_TIMEOUT }, dom => {
      let domSnapshot = window.PercyDOM.serialize({ ...options, dom });

      // Post the DOM snapshot to Percy
      return utils.postSnapshot({
        ...options,
        environmentInfo: ENV_INFO,
        clientInfo: CLIENT_INFO,
        domSnapshot,
        url: dom.URL,
        name
      }).then(() => {
        // Log the snapshot name on success
        cylog(name, { name });
      }).catch(error => {
        // Handle errors
        log.error(`Could not take DOM snapshot "${name}"`);
        log.error(error);
      });
    });
  });
});
