import { Test, TestingModule } from '@nestjs/testing';
import { delay } from 'rxjs/operators';
import { ACOptions } from './ac-options.interface';
import { AccessControlModule } from './access-control.module';
import { RULES_BUILDER_TOKEN } from './constants';
import { GrantsController } from './controller/grants.controller';
import { RulesBuilder } from './rules-builder.class';

describe('forRootAsync', () => {
    it('Can instance with provider method', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AccessControlModule.forRootAsync({
                    useFactory: (): RulesBuilder => new RulesBuilder(),
                }),
            ],
        }).compile();

        const rules = module.get(RULES_BUILDER_TOKEN);

        expect(rules).toBeInstanceOf(RulesBuilder);
    });

    it('Can instance with async provider method', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                AccessControlModule.forRootAsync({
                    useFactory: async (): Promise<RulesBuilder> => {
                        await delay(100);
                        return new RulesBuilder();
                    },
                }),
            ],
        }).compile();

        const rules = module.get(RULES_BUILDER_TOKEN);

        expect(rules).toBeInstanceOf(RulesBuilder);
    });
});

describe('forRoles', () => {
    it('Expose <grantsEndpoint> when options is provided', async () => {
        const rules: RulesBuilder = new RulesBuilder();
        const options: ACOptions = { grantsEndpoint: 'grants' };

        const module: TestingModule = await Test.createTestingModule({
            imports: [AccessControlModule.forRules(rules, options)],
        }).compile();

        const controller = module.get<GrantsController>(GrantsController);

        expect(controller).toBeDefined();
        expect(Reflect.getMetadata('path', GrantsController)).toBe(options.grantsEndpoint);
    });

    it('Do not expose <grantsEndpoint> when options with no <grantsEndpoint> provided', async () => {
        const rules: RulesBuilder = new RulesBuilder();
        const options: ACOptions = {};

        const module: TestingModule = await Test.createTestingModule({
            imports: [AccessControlModule.forRules(rules, options)],
        }).compile();

        expect(() => {
            module.get<GrantsController>(GrantsController);
        }).toThrowError();
    });

    it('Do not expose <grantsEndpoint> when options is not provided', async () => {
        const rules: RulesBuilder = new RulesBuilder();

        const module: TestingModule = await Test.createTestingModule({
            imports: [AccessControlModule.forRules(rules)],
        }).compile();

        expect(() => {
            module.get<GrantsController>(GrantsController);
        }).toThrowError();
    });
});
