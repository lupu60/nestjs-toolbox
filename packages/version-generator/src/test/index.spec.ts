import {
  generate_version,
  generate_feature_version,
  generate_develop_version,
  generate_master_version,
  isDevelop,
  isFeature,
  isMaster,
} from '../lib/lib';

describe('Version Generator', () => {
  const baseOptions = {
    version: '1.2.3',
    commitSha: 'abc123',
    master: 'master',
    develop: 'develop',
    feature: 'feature',
    labelSeparator: '-',
    commitIdSeparator: '.',
    developLabel: 'beta',
    alphaLabel: 'alpha',
  };

  it('should generate correct version string', () => {
    const version = generate_version(baseOptions, 'master');
    expect(version).toBe('1.2.3.abc123');
  });

  it('should identify version types', () => {
    expect(isMaster({ options: baseOptions, branch: 'master' })).toBe(true);
    expect(isDevelop({ options: baseOptions, branch: 'develop' })).toBe(true);
    expect(isFeature({ options: baseOptions, branch: 'feature/test' })).toBe(true);
  });

  it('should handle different branch types', () => {
    const branches = [
      { branch: 'master', expectedVersion: '1.2.3.abc123' },
      { branch: 'develop', expectedVersion: '1.2.3-beta.abc123' },
      { branch: 'feature/new-feature', expectedVersion: '1.2.3-alpha.abc123' },
    ];

    branches.forEach(({ branch, expectedVersion }) => {
      const version = generate_version(baseOptions, branch);
      expect(version).toBe(expectedVersion);
    });
  });

  it('should generate version for non-standard branch types', () => {
    const version = generate_version(baseOptions, 'some-random-branch');
    expect(version).toBe('latest');
  });
});
