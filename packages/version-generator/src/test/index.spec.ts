import { 
  generate_version, 
  _generate_feature_version, 
  _generate_develop_version, 
  _generate_master_version,
  isDevelop,
  isFeature,
  isMaster
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
    alphaLabel: 'alpha'
  };

  // Verify those generator functions are still working even though not directly used in tests
  it('should have working internal generator functions', () => {
    const featureVersion = _generate_feature_version(baseOptions);
    const developVersion = _generate_develop_version(baseOptions);
    const masterVersion = _generate_master_version(baseOptions);

    expect(featureVersion).toMatch(/^1\.2\.3-alpha\.\w+$/);
    expect(developVersion).toMatch(/^1\.2\.3-beta\.\w+$/);
    expect(masterVersion).toMatch(/^1\.2\.3\.\w+$/);
  });

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
      { branch: 'feature/new-feature', expectedVersion: '1.2.3-alpha.abc123' }
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