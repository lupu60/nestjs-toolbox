### Open API spec to TS

Fork of [nest-access-control](https://github.com/nestjsx/nest-access-control), instead making use of [role-acl](https://github.com/tensult/role-acl).
It offers a great flexibility on how to build condition to grant or deny access to specific resources and related actions.

## Installation

```bash
npm i @nest-toolbox/access-control
```

### Example

### Constants

In ./src/data-transfer-object/index.ts

```ts
export const Actions = {
    ReadOne: 'readOne',
    CreateOne: 'CreateOne',
};
export const Resources = {
    FILE: 'file',
};
export const Roles = {
    USER: 'user',
};
```

### Custom Conditions

In ./src/access-control/data/conditions.ts

```ts
import { IDictionary, IFunctionCondition } from '@nest-toolbox/access-control';

export const conditions: IDictionary<IFunctionCondition> = {
    isWorkspaceMember(context: { user: any; workspaceId: number | string }, _args: any): boolean {
        const { user, workspaceId } = context;
        return workspaceId === 'yeah-right';
    },

    async isWorkspaceOwner(context: { user: any; workspaceId: number | string }, _args: any): Promise<boolean> {
        const { user, workspaceId } = context;
        return Promise.resolve(workspaceId === 'hell-yeah');
    },
};
```

### Grants

In ./src/access-control/data/grants.ts

```ts
import { Actions, Resources, Roles } from '../../data-transfer-object';

const customConditions = { isWorkspaceMember: 'custom:isWorkspaceMember', isWorkspaceOwner: 'custom:isWorkspaceOwner' };

export const grants = {
    [Roles.USER]: {
        grants: [
            { resource: Resources.FILE, action: [Actions.CreateOne], attributes: ['*'] },
            {
                resource: Resources.FILE,
                action: Actions.ReadOne,
                attributes: ['*'],
                condition: {
                    Fn: customConditions.isWorkspaceMember,
                    args: { resource: 'workspace' },
                },
            },
        ],
    },
};
```

### ACLGuard

In ./src/access-control/access-control.guard.ts

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getAction, getFeature } from '@nestjsx/crud';
import { getAction as GetAclAction, getResource, InjectRulesBuilder, RulesBuilder } from '@nest-toolbox/access-control';
import { Actions, Resources, Roles } from '../data-transfer-object';

@Injectable()
export class ACLGuard<User extends any = any> implements CanActivate {
    constructor(@InjectRulesBuilder() private readonly ruleBuilder: RulesBuilder) {}

    protected async getUser(context: ExecutionContext): Promise<any> {
        const request = context.switchToHttp().getRequest();
        const { user } = request;
        return { user };
    }

    protected async getUserRoles(context: ExecutionContext): Promise<{ user: any; roles: Roles[] }> {
        const { user } = await this.getUser(context);
        if (!user) {
            throw new UnauthorizedException();
        }
        let { roles } = user;
        return { user, roles };
    }

    isSuperAdmin(roles: Roles[]) {
        return roles.some((role) => role === Roles.SUPER_ADMIN);
    }

    protected getPermissionContextByResource = {
        [Resources.FILE]: this.applyWorkspaceContext,
    };

    protected applyWorkspaceContext(_action: Actions, resource: Resources, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const workspaceId = request.headers['current-workspace'];
        return { workspaceId };
    }

    protected getPermissionContext(_action: Actions, resource: Resources, context: ExecutionContext) {
        return this.getPermissionContextByResource[resource] ? this.getPermissionContextByResource[resource](_action, resource, context) : {};
    }

    protected getActionAndResource(context: ExecutionContext): { action: Actions; resource: Resources } {
        const handler = context.getHandler();
        const controller = context.getClass();
        const resource = getFeature(controller) || getResource(controller);
        const action = getAction(handler) || GetAclAction(handler);
        return { action, resource };
    }

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user, roles: userRoles } = await this.getUserRoles(context);
        if (this.isSuperAdmin(userRoles)) {
            return true;
        }
        const { action, resource } = this.getActionAndResource(context);
        if (!resource || !action) {
            return true;
        }
        const permissionContext = { user, ...this.getPermissionContext(action, resource, context) };
        const permission = await this.ruleBuilder.can(userRoles).context(permissionContext).execute(action).on(resource);
        return permission.granted;
    }
}
```

### Controller

In ./src/file/file.controller.ts

```ts
import { Actions, Resources, Roles } from '../data-transfer-object';
import { ACLGuard } from '../access-control/access-control.guard';
import { Action, Resource } from '@nest-toolbox/access-control/decorators';

@Resource(Resources.FILE)
@UseGuards(AuthGuard('jwt'), ACLGuard)
export class FileController {
    @Action(Actions.ReadOne)
    @Get('preview/:id')
    preview(@Req() request) {
        return 'done';
    }
}
```

### Application module

In ./src/app.module.ts

```ts
import { AccessControlModule, RulesBuilder } from '@nest-toolbox/access-control';
import { Module } from '@nestjs/common';
import { ACLGuard } from './access-control/access-control.guard';
import { conditions, grants } from './access-control/data';
import { FileController } from './file/file.controller';

@Module({
    imports: [
        AccessControlModule.forRootAsync({
            useFactory: (): RulesBuilder => new RulesBuilder(grants, conditions),
        }),
    ],
    providers: [ACLGuard],
    controllers: [FileController],
})
export class AppModule {}
```
