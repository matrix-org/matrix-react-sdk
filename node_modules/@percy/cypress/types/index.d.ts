/// <reference lib="dom"/>
/// <reference types="cypress"/>
import { SnapshotOptions } from '@percy/core';

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      percySnapshot(
        name?: string,
        options?: SnapshotOptions
      ): Chainable<Subject>
    }
  }
}
