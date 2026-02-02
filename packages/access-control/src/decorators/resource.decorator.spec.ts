import { describe, it, expect } from 'vitest';
import { Resource, getResource } from './resource.decorator';
import { RESOURCE_NAME_METADATA } from '../constants';

describe('Resource Decorator', () => {
  it('should set resource metadata on class', () => {
    @Resource('users')
    class TestController {}

    const resource = getResource(TestController);
    expect(resource).toBe('users');
  });

  it('should set resource metadata with different resource names', () => {
    @Resource('posts')
    class PostController {}

    @Resource('comments')
    class CommentController {}

    @Resource('articles')
    class ArticleController {}

    expect(getResource(PostController)).toBe('posts');
    expect(getResource(CommentController)).toBe('comments');
    expect(getResource(ArticleController)).toBe('articles');
  });

  it('should return undefined for classes without resource metadata', () => {
    class TestController {}

    const resource = getResource(TestController);
    expect(resource).toBeUndefined();
  });

  it('should use the correct metadata key', () => {
    @Resource('test-resource')
    class TestController {}

    const metadata = Reflect.getMetadata(RESOURCE_NAME_METADATA, TestController);
    expect(metadata).toBe('test-resource');
  });

  it('should handle empty string resource name', () => {
    @Resource('')
    class TestController {}

    const resource = getResource(TestController);
    expect(resource).toBe('');
  });

  it('should work with generic type parameter', () => {
    interface TestEntity {
      id: number;
      name: string;
    }

    @Resource('entities')
    class TestController {}

    const resource = getResource<TestEntity>(TestController);
    expect(resource).toBe('entities');
  });
});
