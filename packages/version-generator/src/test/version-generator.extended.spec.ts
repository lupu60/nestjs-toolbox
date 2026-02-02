
import { 
  generate_version, 
  generate_feature_version, 
  generate_develop_version, 
  generate_master_version,
  isDevelop,
  isFeature,
  isMaster
} from '../lib/lib';

describe('Version Generator Extended Tests', () => {
  it('should generate version with context', () => {
    const version = generate_version('1.2.3', 'feature', { branch: 'test-feature' });
    expect(version).toMatch(/^1.2.3-feature.d+/);
  });

  it('should handle edge cases in version generation', () => {
    expect(() => generate_version('', 'feature')).toThrow();
    expect(() => generate_version('1.2.3', '')).toThrow();
  });
});
