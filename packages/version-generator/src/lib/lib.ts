export interface Options {
  master: string;
  develop: string;
  feature: string;
  commitSha: string;
  tag: boolean | string;
  packageJson: string;
  developLabel: string;
  alphaLabel: string;
  prodLabel: string;
  labelSeparator: string;
  commitIdSeparator: string;
  version: string;
}

export function generate_feature_version(options: Partial<Options>) {
  const { version, alphaLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  return `${version}${labelSeparator}${alphaLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function generate_develop_version(options: Partial<Options>) {
  const { version, developLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  return `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function generate_master_version(options: Partial<Options>) {
  const { version, commitIdSeparator, commitSha, prodLabel, labelSeparator } = options;
  return `${version}${labelSeparator}${prodLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function isMaster(options: { options: Partial<Options>; branch: string }) {
  const { options: voption, branch } = options;
  if (voption.tag) {
    return true;
  }
  return branch.includes(voption.master);
}

export function isDevelop(options: { options: Partial<Options>; branch: string }) {
  const { options: voption, branch } = options;
  return branch.includes(voption.develop) && !voption.tag;
}

export function isFeature(options: { options: Partial<Options>; branch: string }) {
  const { options: voption, branch } = options;
  return branch.includes(voption.feature) && !voption.tag;
}

export function generate_version(options: Partial<Options>, branch: string) {
  try {
    if (isMaster({ options, branch })) {
      return generate_master_version(options);
    }

    if (isDevelop({ options, branch })) {
      return generate_develop_version(options);
    }

    if (isFeature({ options, branch })) {
      return generate_feature_version(options);
    }

    return 'latest';
  } catch (error) {
    return 'latest';
  }
}
