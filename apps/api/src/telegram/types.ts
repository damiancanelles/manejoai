// Minimal shape of what we read from Telegram's webhook payload - plain
// interfaces (not classes) on purpose, so Nest's global ValidationPipe skips
// validation for this route (it only validates class-typed @Body() params)
// instead of rejecting Telegram's own payload shape against our DTOs.

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  chat: { id: number; type: string; title?: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  media_group_id?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface ParsedReport {
  title: string;
  description: string;
  propertyText: string | null;
}
