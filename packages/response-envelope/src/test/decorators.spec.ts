import 'reflect-metadata';
import { SkipEnvelope, ApiMessage } from '../decorators';
import { SKIP_ENVELOPE_KEY, API_MESSAGE_KEY } from '../constants';

describe('decorators', () => {
  describe('SkipEnvelope', () => {
    it('sets the correct metadata key with value true', () => {
      class TestController {
        @SkipEnvelope()
        handler() {}
      }

      const metadata = Reflect.getMetadata(SKIP_ENVELOPE_KEY, TestController.prototype.handler);
      expect(metadata).toBe(true);
    });
  });

  describe('ApiMessage', () => {
    it('sets the correct metadata key with the provided message', () => {
      class TestController {
        @ApiMessage('User created successfully')
        handler() {}
      }

      const metadata = Reflect.getMetadata(API_MESSAGE_KEY, TestController.prototype.handler);
      expect(metadata).toBe('User created successfully');
    });

    it('handles empty string message', () => {
      class TestController {
        @ApiMessage('')
        handler() {}
      }

      const metadata = Reflect.getMetadata(API_MESSAGE_KEY, TestController.prototype.handler);
      expect(metadata).toBe('');
    });
  });
});
