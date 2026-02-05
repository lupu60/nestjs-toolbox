import { REQUEST_CONTEXT_OPTIONS } from '../constants';
import { RequestContextMiddleware } from '../request-context.middleware';
import { RequestContextModule } from '../request-context.module';

describe('RequestContextModule', () => {
  describe('forRoot()', () => {
    it('returns a DynamicModule with correct structure', () => {
      const result = RequestContextModule.forRoot();

      expect(result).toHaveProperty('module', RequestContextModule);
      expect(result).toHaveProperty('global', true);
      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('exports');
      expect(result.exports).toContain(RequestContextMiddleware);
    });

    it('sets global: true', () => {
      const result = RequestContextModule.forRoot();
      expect(result.global).toBe(true);
    });

    it('provides REQUEST_CONTEXT_OPTIONS with given options', () => {
      const options = { requestIdHeader: 'x-custom', setResponseHeader: false };
      const result = RequestContextModule.forRoot(options);

      const optionsProvider = result.providers!.find((p: any) => p.provide === REQUEST_CONTEXT_OPTIONS) as any;

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual(options);
    });

    it('provides RequestContextMiddleware', () => {
      const result = RequestContextModule.forRoot();

      expect(result.providers).toContain(RequestContextMiddleware);
    });

    it('with no args uses empty options', () => {
      const result = RequestContextModule.forRoot();

      const optionsProvider = result.providers!.find((p: any) => p.provide === REQUEST_CONTEXT_OPTIONS) as any;

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual({});
    });
  });

  describe('forRootAsync()', () => {
    it('returns a DynamicModule with correct structure', () => {
      const result = RequestContextModule.forRootAsync({
        useFactory: () => ({ requestIdHeader: 'x-async' }),
      });

      expect(result).toHaveProperty('module', RequestContextModule);
      expect(result).toHaveProperty('global', true);
      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('exports');
      expect(result.exports).toContain(RequestContextMiddleware);
    });

    it('includes imports from options', () => {
      const FakeModule = class FakeModule {};
      const result = RequestContextModule.forRootAsync({
        imports: [FakeModule],
        useFactory: () => ({}),
      });

      expect(result.imports).toContain(FakeModule);
    });

    it('provides the factory for REQUEST_CONTEXT_OPTIONS', () => {
      const factory = vi.fn(() => ({ requestIdHeader: 'x-factory' }));
      const InjectToken = 'CONFIG_SERVICE';

      const result = RequestContextModule.forRootAsync({
        useFactory: factory,
        inject: [InjectToken],
      });

      const optionsProvider = result.providers!.find((p: any) => p.provide === REQUEST_CONTEXT_OPTIONS) as any;

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useFactory).toBe(factory);
      expect(optionsProvider.inject).toContain(InjectToken);
    });

    it('defaults to empty imports and inject when not provided', () => {
      const result = RequestContextModule.forRootAsync({});

      expect(result.imports).toEqual([]);

      const optionsProvider = result.providers!.find((p: any) => p.provide === REQUEST_CONTEXT_OPTIONS) as any;

      expect(optionsProvider.inject).toEqual([]);
    });

    it('defaults to a no-op factory when useFactory is not provided', () => {
      const result = RequestContextModule.forRootAsync({});

      const optionsProvider = result.providers!.find((p: any) => p.provide === REQUEST_CONTEXT_OPTIONS) as any;

      expect(optionsProvider.useFactory).toBeDefined();
      expect(optionsProvider.useFactory()).toEqual({});
    });
  });
});
