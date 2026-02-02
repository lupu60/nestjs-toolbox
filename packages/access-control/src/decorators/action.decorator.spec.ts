import { describe, expect, it } from 'vitest';
import { ACTION_NAME_METADATA } from '../constants';
import { Action, getAction } from './action.decorator';

describe('Action Decorator', () => {
  it('should set action metadata on target', () => {
    class TestController {
      @Action('read')
      testMethod() {
        return 'test';
      }
    }

    const controller = new TestController();
    const action = getAction(controller.testMethod);
    expect(action).toBe('read');
  });

  it('should set action metadata with different action names', () => {
    class TestController {
      @Action('create')
      createMethod() {
        return 'create';
      }

      @Action('update')
      updateMethod() {
        return 'update';
      }

      @Action('delete')
      deleteMethod() {
        return 'delete';
      }
    }

    const controller = new TestController();
    expect(getAction(controller.createMethod)).toBe('create');
    expect(getAction(controller.updateMethod)).toBe('update');
    expect(getAction(controller.deleteMethod)).toBe('delete');
  });

  it('should return undefined for methods without action metadata', () => {
    class TestController {
      testMethod() {
        return 'test';
      }
    }

    const controller = new TestController();
    const action = getAction(controller.testMethod);
    expect(action).toBeUndefined();
  });

  it('should use the correct metadata key', () => {
    class TestController {
      @Action('test-action')
      testMethod() {
        return 'test';
      }
    }

    const controller = new TestController();
    const metadata = Reflect.getMetadata(ACTION_NAME_METADATA, controller.testMethod);
    expect(metadata).toBe('test-action');
  });

  it('should handle empty string action name', () => {
    class TestController {
      @Action('')
      testMethod() {
        return 'test';
      }
    }

    const controller = new TestController();
    const action = getAction(controller.testMethod);
    expect(action).toBe('');
  });
});
