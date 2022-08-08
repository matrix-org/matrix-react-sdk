import cp from 'child_process';

export function mockgit(branch = '') {
  let spy = jasmine.createSpy('git');

  spyOn(cp, 'execSync').and.callFake(function(cmd, options) {
    if (cmd.match(/^git\b/)) {
      let result = spy(...cmd.split(' ').slice(1)) ?? '';
      if (!cmd.match(/\b(show|rev-parse)\b/)) return '';
      if (!cmd.includes('rev-parse')) return result;
      if (cmd.includes('--abbrev-ref')) return branch;
      return result.match(/^COMMIT_SHA:(.*)$/m)?.[1];
    } else {
      return cp.execSync.and.originalFn.call(this, cmd, options);
    }
  });

  return spy;
}
