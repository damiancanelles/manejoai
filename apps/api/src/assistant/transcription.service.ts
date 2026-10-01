import { Injectable, InternalServerErrorException } from '@nestjs/common';

// Deepgram's prerecorded transcription API - a single REST call, no SDK.
// Claude's own Messages API has no audio input, so a voice message to the
// assistant has to become text here first; from that point on it's just a
// normal chat message through the existing tool-use loop.
@Injectable()
export class TranscriptionService {
  async transcribe(buffer: Buffer, mimetype: string): Promise<string> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Speech-to-text is not configured.');
    }

    const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimetype || 'audio/webm',
      },
      body: buffer as unknown as BodyInit,
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Transcription failed: ${await res.text()}`);
    }

    const data = await res.json();
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    return transcript.trim();
  }
}
