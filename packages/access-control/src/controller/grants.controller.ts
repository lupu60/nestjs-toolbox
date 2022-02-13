import { Controller, Get } from '@nestjs/common';
import { InjectRulesBuilder } from '../decorators/inject-rules-builder.decorator';
import { RulesBuilder } from '../rules-builder.class';

@Controller()
export class GrantsController {
  constructor(@InjectRulesBuilder() private readonly ruleBuilder: RulesBuilder) {}

  @Get()
  public getGrants() {
    return this.ruleBuilder.getGrants();
  }
}
