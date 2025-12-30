'use server';

import { google } from 'googleapis';

const SHEET_ID = '1Wd9XuPn5yVxQSMl4ffVTry3Xjk_-h2K4GX2myNMBWxU';
const SHEET_NAME = 'Minimax 易念錯字';

// Initialize Google Sheets client
function getGoogleSheetsClient() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

export interface DictionaryEntry {
    word: string;
    pinyin: string;
    rowIndex?: number; // 1-indexed row number in sheet
}

/**
 * Check if a word exists in the dictionary
 * Returns the entry with row index if found, null otherwise
 */
export async function checkWord(word: string): Promise<DictionaryEntry | null> {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${SHEET_NAME}'!A:B`,
    });

    const rows = response.data.values || [];

    // Skip header row (index 0), search from index 1
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === word) {
            return {
                word: rows[i][0],
                pinyin: rows[i][1] || '',
                rowIndex: i + 1, // Convert to 1-indexed row number
            };
        }
    }

    return null;
}

/**
 * Save a word to the dictionary (append or update)
 */
export async function saveWord(word: string, pinyin: string, rowIndex?: number): Promise<void> {
    const sheets = getGoogleSheetsClient();

    if (rowIndex) {
        // Update existing row
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `'${SHEET_NAME}'!A${rowIndex}:B${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[word, pinyin]],
            },
        });
    } else {
        // Append new row
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `'${SHEET_NAME}'!A:B`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[word, pinyin]],
            },
        });
    }
}

/**
 * Get all dictionary entries and format for MiniMax
 * Returns the pronunciation_dict format
 */
export async function getAllWords(): Promise<{ tone: string[] }> {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${SHEET_NAME}'!A:B`,
    });

    const rows = response.data.values || [];
    const tone: string[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
        const word = rows[i][0];
        const pinyin = rows[i][1];
        if (word && pinyin) {
            tone.push(`${word}/${pinyin}`);
        }
    }

    return { tone };
}
