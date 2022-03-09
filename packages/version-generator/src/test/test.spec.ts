import {
  generate_develop_version,
  generate_feature_version,
  generate_master_version,
  generate_version,
  isDevelop,
  isFeature,
  isMaster,
} from '../lib/lib';

describe('version-generator', () => {
  const version = '1.0.0';
  const alphaLabel = 'alpha';
  const developLabel = 'beta';
  const labelSeparator = '-';
  const commitIdSeparator = '.';
  const commitSha = 'ebffb639b71631c1221fd9ee1c0d32e4fbe9a024';

  const options = {
    version,
    alphaLabel,
    developLabel,
    labelSeparator,
    commitIdSeparator,
    commitSha,
    master: 'master',
    develop: 'develop',
    feature: 'feature',
  };

  it('generate_feature_version', () => {
    const generated = generate_feature_version(options);
    expect(generated).toEqual('1.0.0-alpha.ebffb63');
  });

  it('generate_develop_version', () => {
    const generated = generate_develop_version(options);
    expect(generated).toEqual('1.0.0-beta.ebffb63');
  });

  it('generate_master_version', () => {
    const generated = generate_master_version(options);
    expect(generated).toEqual('1.0.0.ebffb63');
  });

  it('isMaster', () => {
    expect(isMaster({ options: { ...options, tag: true }, branch: 'master' })).toEqual(true);
    expect(isMaster({ options, branch: 'master' })).toEqual(true);
    expect(isMaster({ options: { ...options, tag: true }, branch: 'develop' })).toEqual(true);
    expect(isMaster({ options: {}, branch: 'develop' })).toEqual(false);
  });

  it('isDevelop', () => {
    expect(isDevelop({ options: { tag: true }, branch: 'develop' })).toEqual(false);
    expect(isDevelop({ options: { develop: 'develop' }, branch: 'develop' })).toEqual(true);
    expect(isDevelop({ options: {}, branch: 'master' })).toEqual(false);
  });

  it('isFeature', () => {
    expect(isFeature({ options: { tag: true }, branch: 'develop' })).toEqual(false);
    expect(isFeature({ options: { feature: 'feature' }, branch: 'feature/cool-feature' })).toEqual(true);
    expect(isFeature({ options: {}, branch: 'master' })).toEqual(false);
  });

  it('generate_version', () => {
    const options = {
      version,
      alphaLabel,
      developLabel,
      labelSeparator,
      commitIdSeparator,
      commitSha,
      master: 'master',
      develop: 'develop',
      feature: 'feature',
    };

    expect(generate_version(options, 'master')).toEqual('1.0.0.ebffb63');
    expect(generate_version({ ...options, tag: true }, 'develop')).toEqual('1.0.0.ebffb63');
    expect(generate_version(options, 'develop')).toEqual('1.0.0-beta.ebffb63');
    expect(generate_version(options, 'feature/cool-feature')).toEqual('1.0.0-alpha.ebffb63');
  });
});
