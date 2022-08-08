import { JSONSchema } from 'json-schema-typed';

interface Pojo { [x: string]: any; }
export interface PercyConfigObject extends Pojo { version: number; }

declare namespace PercyConfig {
  function load(options?: {
    path?: undefined | string | false,
    overrides?: Pojo,
    reload?: boolean,
    bail?: boolean
  }): PercyConfigObject;

  function validate(
    config: PercyConfigObject,
    options?: { scrub?: boolean }
  ): boolean;

  function addSchema(schemas: {
    [x: string]: JSONSchema
  }): void;

  function getDefaults(
    overrides?: Pojo
  ): PercyConfigObject;

  function stringify(
    format: 'yaml' | 'json' | 'js',
    config?: PercyConfigObject
  ): string;
}

export default PercyConfig
