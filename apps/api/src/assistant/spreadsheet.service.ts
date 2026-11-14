import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

// Keeps a big spreadsheet from silently blowing past the chat message's own
// length limit once the user's own text is added on top of it.
const MAX_CHARS = 20000;

// Turns an uploaded .xlsx/.xls/.csv into plain text for the chat - same
// role as transcription.service.ts for voice: a file becomes text the
// assistant widget inserts into the compose box, not a new chat-protocol
// shape. Uses the same xlsx library as scripts/import-excel.ts.
@Injectable()
export class SpreadsheetService {
  parseToText(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const multiSheet = workbook.SheetNames.length > 1;

    const parts = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]).trim();
      if (!csv) return '';
      return multiSheet ? `Sheet "${name}":\n${csv}` : csv;
    }).filter(Boolean);

    let text = parts.join('\n\n');
    if (text.length > MAX_CHARS) {
      text = `${text.slice(0, MAX_CHARS)}\n\n[... truncated - the spreadsheet is larger than ${MAX_CHARS} characters ...]`;
    }
    return text;
  }
}
