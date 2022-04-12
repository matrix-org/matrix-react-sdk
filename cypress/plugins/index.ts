/// <reference types="cypress" />

import { synapseDocker } from "./synapsedocker/index";

export default function(on, config) {
    synapseDocker(on, config);
}
