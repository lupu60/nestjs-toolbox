export interface Options {
  master: string;
  develop: string;
  feature: string;
  commitSha: string;
  tag: boolean | string;
  packageJson: string;
  developLabel: string;
  alphaLabel: string;
  labelSeparator: string;
  commitIdSeparator: string;
  version: string;
}

export function generate_feature_version(options: Partial<Options>): string {
  const { version, alphaLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${labelSeparator}${alphaLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function generate_develop_version(options: Partial<Options>): string {
  const { version, developLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function generate_master_version(options: Partial<Options>): string {
  const { version, commitIdSeparator, commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function isMaster(options: { options: Partial<Options>; branch: string }): boolean {
  const { options: voption, branch } = options;
  if (voption.tag) {
    return true;
  }
  if (!voption.master) {
    return false;
  }
  return branch.includes(voption.master);
}

export function isDevelop(options: { options: Partial<Options>; branch: string }): boolean {
  const { options: voption, branch } = options;
  if (!voption.develop) {
    return false;
  }
  return branch.includes(voption.develop) && !voption.tag;
}

export function isFeature(options: { options: Partial<Options>; branch: string }): boolean {
  const { options: voption, branch } = options;
  if (!voption.feature) {
    return false;
  }
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
