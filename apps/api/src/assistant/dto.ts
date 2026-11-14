import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ACTION_TYPES, ActionType } from './action-types';

// Claude's vision support only takes these four - see Anthropic's
// Base64ImageSource type.
export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export class ImageAttachmentDto {
  @IsIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  mediaType!: ImageMediaType;

  // Base64, no "data:image/...;base64," prefix - the dedicated chat page
  // strips that client-side before sending.
  @IsString()
  data!: string;
}

export class AssistantMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  // Raised from 4000 - the dedicated chat page (unlike the corner widget)
  // is meant for pasting real documents/long context, not just a quick
  // question. class-validator's MaxLength still lets this through empty
  // ("" is a valid string), which matters for an image-only turn with no
  // caption.
  @IsString()
  @MaxLength(100000)
  content!: string;

  // Only ever sent by a user turn from the dedicated chat page - lets
  // Claude actually see the image (vision), not just read a caption of it.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  images?: ImageAttachmentDto[];
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
