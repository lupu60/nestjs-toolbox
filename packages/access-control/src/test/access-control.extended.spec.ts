
import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlModule } from '../access.control.module';

describe('AccessControlModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AccessControlModule.forRoot({ grantsEndpoint: true })]
    }).compile();
  });

  it('should create module with grants endpoint', () => {
    const accessControlModule = module.get(AccessControlModule);
    expect(accessControlModule).toBeDefined();
  });
});
