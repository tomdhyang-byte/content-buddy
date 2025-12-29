import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const AUTO_VIDEO_MAKER_URL = process.env.AUTO_VIDEO_MAKER_URL || 'http://127.0.0.1:8000';
const EXPORT_TEMP_DIR = process.env.EXPORT_TEMP_DIR || '/tmp';

interface ExportRequestBody {
    script: string;
    segments: Array<{
        id: string;
        text: string;
        imageUrl: string;  // Base64 data URL
        audioUrl: string;  // Base64 data URL
    }>;
}

interface SubmitJobResponse {
    job_id: string;
    status: string;
    message: string;
}

interface JobStatusResponse {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message: string;
    output_file_path?: string;
    error?: string;
}

// Helper: Decode Base64 data URL to Buffer
function decodeBase64DataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid data URL format');
    }
    return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64'),
    };
}

// POST: Submit export job
export async function POST(request: NextRequest) {
    try {
        // Parse multipart form data (for avatar video file)
        const formData = await request.formData();

        const avatarVideo = formData.get('avatarVideo') as File | null;
        const script = formData.get('script') as string;
        const segmentsJson = formData.get('segments') as string;
        const skipSubtitle = formData.get('skipSubtitle') === 'true';

        if (!avatarVideo) {
            return NextResponse.json(
                { error: 'Missing avatar video file' },
                { status: 400 }
            );
        }

        const segments: ExportRequestBody['segments'] = JSON.parse(segmentsJson);

        if (!segments || segments.length === 0) {
            return NextResponse.json(
                { error: 'No segments provided' },
                { status: 400 }
            );
        }

        // 1. Create temp folder
        const exportId = uuidv4();
        const folderPath = path.join(EXPORT_TEMP_DIR, `cb-export-${exportId}`);
        await mkdir(folderPath, { recursive: true });

        console.log(`[Export] Created folder: ${folderPath}`);

        // 2. Write avatar_full.mp4
        const avatarBuffer = Buffer.from(await avatarVideo.arrayBuffer());
        await writeFile(path.join(folderPath, 'avatar_full.mp4'), avatarBuffer);
        console.log(`[Export] Wrote avatar_full.mp4`);

        // 3. Write full_script.txt
        await writeFile(path.join(folderPath, 'full_script.txt'), script, 'utf8');
        console.log(`[Export] Wrote full_script.txt`);

        // 4. Write segment images and audio
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const index = i + 1;

            // Write image (1.jpg, 2.jpg, ...)
            if (segment.imageUrl && segment.imageUrl.startsWith('data:')) {
                const { buffer: imageBuffer } = decodeBase64DataUrl(segment.imageUrl);
                await writeFile(path.join(folderPath, `${index}.jpg`), imageBuffer);
                console.log(`[Export] Wrote ${index}.jpg`);
            }

            // Write audio (1.mp3, 2.mp3, ...)
            if (segment.audioUrl && segment.audioUrl.startsWith('data:')) {
                const { buffer: audioBuffer } = decodeBase64DataUrl(segment.audioUrl);
                await writeFile(path.join(folderPath, `${index}.mp3`), audioBuffer);
                console.log(`[Export] Wrote ${index}.mp3`);
            }
        }

        // 5. Call AutoVideoMaker API
        const apiUrl = new URL(`${AUTO_VIDEO_MAKER_URL}/api/process-video-local`);
        apiUrl.searchParams.set('folder_path', folderPath);
        apiUrl.searchParams.set('callback_url', 'http://localhost:3000/api/export/callback'); // Placeholder, we use polling
        apiUrl.searchParams.set('skip_subtitle', String(skipSubtitle));

        console.log(`[Export] Calling AutoVideoMaker: ${apiUrl}`);

        const response = await fetch(apiUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Export] AutoVideoMaker error: ${errorText}`);
            return NextResponse.json(
                { error: 'Failed to submit job to AutoVideoMaker', details: errorText },
                { status: 500 }
            );
        }

        const jobResult: SubmitJobResponse = await response.json();
        console.log(`[Export] Job submitted: ${jobResult.job_id}`);

        return NextResponse.json({
            jobId: jobResult.job_id,
            status: jobResult.status,
            message: jobResult.message,
            folderPath,
        });

    } catch (error) {
        console.error('[Export] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process export',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET: Check job status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return NextResponse.json(
                { error: 'Missing jobId parameter' },
                { status: 400 }
            );
        }

        const apiUrl = `${AUTO_VIDEO_MAKER_URL}/api/jobs/${jobId}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to get job status', details: errorText },
                { status: 500 }
            );
        }

        const jobStatus: JobStatusResponse = await response.json();

        return NextResponse.json({
            jobId: jobStatus.job_id,
            status: jobStatus.status,
            message: jobStatus.message,
            outputFilePath: jobStatus.output_file_path,
            error: jobStatus.error,
        });

    } catch (error) {
        console.error('[Export] Status check error:', error);
        return NextResponse.json(
            {
                error: 'Failed to check job status',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
