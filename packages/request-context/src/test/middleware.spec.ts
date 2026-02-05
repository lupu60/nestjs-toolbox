import { RequestContext } from '../request-context';
import { RequestContextMiddleware } from '../request-context.middleware';

describe('RequestContextMiddleware', () => {
  function createReq(headers: Record<string, string> = {}) {
    return { headers };
  }

  function createRes() {
    return { setHeader: vi.fn() };
  }

  describe('request ID generation', () => {
    it('generates a UUID request ID when no header is present', () => {
      const middleware = new RequestContextMiddleware();
      const req = createReq();
      const res = createRes();

      let capturedId: string | undefined;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
      });

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(capturedId).toBeDefined();
      expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('uses request ID from x-request-id header when present', () => {
      const middleware = new RequestContextMiddleware();
      const req = createReq({ 'x-request-id': 'custom-id-from-header' });
      const res = createRes();

      let capturedId: string | undefined;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
      });

      middleware.use(req, res, next);

      expect(capturedId).toBe('custom-id-from-header');
    });

    it('uses custom header name from options', () => {
      const middleware = new RequestContextMiddleware({
        requestIdHeader: 'x-correlation-id',
      });
      const req = createReq({ 'x-correlation-id': 'corr-abc' });
      const res = createRes();

      let capturedId: string | undefined;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
      });

      middleware.use(req, res, next);

      expect(capturedId).toBe('corr-abc');
    });

    it('uses custom generateId function from options', () => {
      const customGenerator = vi.fn(() => 'generated-custom-id');
      const middleware = new RequestContextMiddleware({
        generateId: customGenerator,
      });
      const req = createReq();
      const res = createRes();

      let capturedId: string | undefined;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
      });

      middleware.use(req, res, next);

      expect(customGenerator).toHaveBeenCalled();
      expect(capturedId).toBe('generated-custom-id');
    });

    it('handles empty header string by generating a new ID', () => {
      const middleware = new RequestContextMiddleware();
      const req = createReq({ 'x-request-id': '' });
      const res = createRes();

      let capturedId: string | undefined;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
      });

      middleware.use(req, res, next);

      expect(capturedId).toBeDefined();
      expect(capturedId).not.toBe('');
      expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('response header', () => {
    it('sets x-request-id response header by default', () => {
      const middleware = new RequestContextMiddleware();
      const req = createReq({ 'x-request-id': 'resp-test-id' });
      const res = createRes();
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'resp-test-id');
    });

    it('uses custom response header name from options', () => {
      const middleware = new RequestContextMiddleware({
        responseIdHeader: 'x-trace-id',
      });
      const req = createReq({ 'x-request-id': 'trace-123' });
      const res = createRes();
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', 'trace-123');
    });

    it('skips response header when setResponseHeader is false', () => {
      const middleware = new RequestContextMiddleware({
        setResponseHeader: false,
      });
      const req = createReq();
      const res = createRes();
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('context availability', () => {
    it('makes request ID available via RequestContext.requestId inside next()', () => {
      const middleware = new RequestContextMiddleware();
      const req = createReq({ 'x-request-id': 'available-in-next' });
      const res = createRes();

      let capturedId: string | undefined;
      let hasContext = false;
      const next = vi.fn(() => {
        capturedId = RequestContext.requestId;
        hasContext = RequestContext.has('nonexistent') === false; // context exists but key doesn't
      });

      middleware.use(req, res, next);

      expect(capturedId).toBe('available-in-next');
      expect(hasContext).toBe(true);
    });
  });
});
