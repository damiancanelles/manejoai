import { IsArray, IsIn, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ACTION_TYPES, ActionType } from './action-types';

export class AssistantMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages!: AssistantMessageDto[];
}

// Body of POST /assistant/actions/execute - exactly what the approval card
// showed the user. `params` is re-validated against the matching DTO for
// `type` inside AssistantService.executeAction - this DTO only checks the
// envelope, not the action-specific fields.
export class ExecuteActionDto {
  @IsIn(ACTION_TYPES)
  type!: ActionType;

  @IsObject()
  params!: Record<string, unknown>;
}
