/**
 * Decorators for @nest-toolbox/response-envelope
 */

import { SetMetadata } from '@nestjs/common';
import { API_MESSAGE_KEY, SKIP_ENVELOPE_KEY } from './constants';

/**
 * Skip the response envelope for a specific route handler.
 * The raw controller return value will be sent as-is.
 *
 * @example
 * ```typescript
 * @Get('health')
 * @SkipEnvelope()
 * health() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);

/**
 * Set a custom success message for a route handler's response envelope.
 *
 * @param message - The message to include in the response envelope
 *
 * @example
 * ```typescript
 * @Post()
 * @ApiMessage('User created successfully')
 * create(@Body() dto: CreateUserDto) {
 *   return this.usersService.create(dto);
 * }
 * ```
 */
export const ApiMessage = (message: string) => SetMetadata(API_MESSAGE_KEY, message);
