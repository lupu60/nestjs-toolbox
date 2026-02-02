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
  branch?: string;
}

export function _generate_feature_version(options: Partial<Options>): string {
  const { version, alphaLabel = 'alpha', labelSeparator = '-', commitIdSeparator = '.', commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${labelSeparator}${alphaLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function _generate_develop_version(options: Partial<Options>): string {
  const { version, developLabel = 'beta', labelSeparator = '-', commitIdSeparator = '.', commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

export function _generate_master_version(options: Partial<Options>): string {
  const { version, commitIdSeparator = '.', commitSha } = options;
  if (!commitSha) {
    throw new Error('commitSha is required');
  }
  return `${version}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

// Keep existing names for backwards compatibility
export const generate_feature_version = _generate_feature_version;
export const generate_develop_version = _generate_develop_version;
export const generate_master_version = _generate_master_version;

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

export function generate_version(options: Partial<Options>, branch?: string): string {
  const fullOptions = { ...options, branch };
  
  try {
    const effectiveBranch = branch || fullOptions.branch || 'unknown';

    if (isMaster({ options: fullOptions, branch: effectiveBranch })) {
      return _generate_master_version(fullOptions);
    }

    if (isDevelop({ options: fullOptions, branch: effectiveBranch })) {
      return _generate_develop_version(fullOptions);
    }

    if (isFeature({ options: fullOptions, branch: effectiveBranch })) {
      return _generate_feature_version(fullOptions);
    }

    return 'latest';
  } catch {
    return 'latest';
  }
}