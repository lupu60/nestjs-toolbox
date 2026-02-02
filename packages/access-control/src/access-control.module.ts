import { type Abstract, type DynamicModule, Global, Module, type ModuleMetadata, type Provider, type Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import type { ACOptions } from './ac-options.interface';
import { RULES_BUILDER_TOKEN } from './constants';
import { GrantsController } from './controller/grants.controller';
import { RulesBuilder } from './rules-builder.class';

export type Injection = (Type<any> | string | symbol | Abstract<any> | Function)[];

export interface AccessControlOptionsFactory {
  createAccessControlOptions(rules: RulesBuilder, options?: ACOptions): Promise<RulesBuilder> | RulesBuilder;
}

export interface AccessControlModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<AccessControlOptionsFactory>;
  useClass?: Type<RulesBuilder>;
  useFactory?: (...args: any[]) => Promise<RulesBuilder> | RulesBuilder;
  inject?: Injection;
}

@Global()
@Module({})
export class AccessControlModule {
  public static forRules(rules: RulesBuilder, options?: ACOptions): DynamicModule {
    let controllers: Type<any>[] = [];

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

  public static forRootAsync(options: AccessControlModuleAsyncOptions): DynamicModule {
    const { inject = [], imports = [], useFactory, useExisting, useClass } = options;
    let provider: Provider<RulesBuilder | Promise<RulesBuilder>>;

    if (useExisting) {
      provider = {
        provide: RULES_BUILDER_TOKEN,
        useExisting,
      };
    } else if (useClass) {
      provider = {
        provide: RULES_BUILDER_TOKEN,
        useClass,
      };
    } else {
      provider = {
        provide: RULES_BUILDER_TOKEN,
        useFactory: useFactory || (() => new RulesBuilder()),
        inject,
      };
    }

    return {
      module: AccessControlModule,
      imports,
      providers: [provider],
      exports: [provider],
    };
  }
}
