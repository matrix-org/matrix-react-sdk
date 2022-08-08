// Config schema for static directories
export const configSchema = {
  static: {
    type: 'object',
    $ref: '/snapshot#/$defs/filter',
    unevaluatedProperties: false,
    properties: {
      baseUrl: {
        $ref: '/snapshot/server#/properties/baseUrl'
      },
      cleanUrls: {
        $ref: '/snapshot/server#/properties/cleanUrls'
      },
      rewrites: {
        $ref: '/snapshot/server#/properties/rewrites'
      },
      options: {
        $ref: '/snapshot#/$defs/options'
      }
    }
  },
  sitemap: {
    type: 'object',
    $ref: '/snapshot#/$defs/filter',
    unevaluatedProperties: false,
    properties: {
      options: {
        $ref: '/snapshot#/$defs/options'
      }
    }
  }
};
export function configMigration(config, util) {
  /* eslint-disable curly */
  if (config.version < 2) {
    // static-snapshots and options were renamed
    util.map('staticSnapshots.baseUrl', 'static.baseUrl');
    util.map('staticSnapshots.snapshotFiles', 'static.include');
    util.map('staticSnapshots.ignoreFiles', 'static.exclude');
    util.del('staticSnapshots');
  } else {
    let notice = {
      type: 'config',
      until: '1.0.0'
    }; // static files and ignore options were renamed

    util.deprecate('static.files', {
      map: 'static.include',
      ...notice
    });
    util.deprecate('static.ignore', {
      map: 'static.exclude',
      ...notice
    }); // static and sitemap option overrides were renamed

    util.deprecate('static.overrides', {
      map: 'static.options',
      ...notice
    });
    util.deprecate('sitemap.overrides', {
      map: 'sitemap.options',
      ...notice
    });

    for (let i in ((_config$static = config.static) === null || _config$static === void 0 ? void 0 : _config$static.options) || []) {
      var _config$static;

      let k = `static.options[${i}]`;
      util.deprecate(`${k}.files`, {
        map: `${k}.include`,
        ...notice
      });
      util.deprecate(`${k}.ignore`, {
        map: `${k}.exclude`,
        ...notice
      });
    }
  }
}