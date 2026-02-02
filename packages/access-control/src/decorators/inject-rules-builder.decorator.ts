import { Inject } from "@nestjs/common";
import { RULES_BUILDER_TOKEN } from "../constants";

export const InjectRulesBuilder = () => Inject(RULES_BUILDER_TOKEN);
