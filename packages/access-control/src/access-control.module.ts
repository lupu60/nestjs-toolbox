import { Abstract, DynamicModule, Global, Module, Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ACOptions } from './ac-options.interface';
import { RULES_BUILDER_TOKEN } from './constants';
import { GrantsController } from './controller/grants.controller';
import { RulesBuilder } from './rules-builder.class';

// tslint:disable-next-line: ban-types
type Injection = (Type<any> | string | symbol | Abstract<any> | Function)[];

@Global()
@Module({})
export class AccessControlModule {
    public static forRules(rules: RulesBuilder, options?: ACOptions): DynamicModule {
        let controllers = [];

        if (options) {
            Reflect.defineMetadata(PATH_METADATA, options.grantsEndpoint, GrantsController);
            controllers = [...(options.grantsEndpoint ? [GrantsController] : [])];
        }

        return {
            module: AccessControlModule,
            controllers: [...controllers],
            providers: [
                {
                    provide: RULES_BUILDER_TOKEN,
                    useValue: rules,
                },
            ],
            exports: [
                {
                    provide: RULES_BUILDER_TOKEN,
                    useValue: rules,
                },
            ],
        };
    }

    public static forRootAsync(options: { inject?: Injection; useFactory: (...args: any) => RulesBuilder | Promise<RulesBuilder> }): DynamicModule {
        const provider = {
            provide: RULES_BUILDER_TOKEN,
            useFactory: options.useFactory,
            inject: options.inject || [],
        };

        return {
            module: AccessControlModule,
            providers: [provider],
            exports: [provider],
        };
    }
}
