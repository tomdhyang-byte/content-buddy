import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json(
                { error: 'Missing path parameter' },
                { status: 400 }
            );
        }

        // Security: Only allow files from /tmp/cb-export-* or /private/tmp/cb-export-* directories
        // Note: On macOS, /tmp is a symlink to /private/tmp, so we need to allow both
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith('/tmp/cb-export-') &&
            !normalizedPath.startsWith('/private/tmp/cb-export-')) {
            return NextResponse.json(
                { error: 'Invalid file path' },
                { status: 403 }
            );
        }

        // Check if file exists
        try {
            await stat(normalizedPath);
        } catch {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            );
        }

        // Read file
        const fileBuffer = await readFile(normalizedPath);
        const fileName = path.basename(normalizedPath);

        // Return file with appropriate headers
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(fileBuffer.length),
            },
        });

    } catch (error) {
        console.error('[Download] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to download file',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
