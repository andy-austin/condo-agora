import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only image files are allowed (PNG, JPG, WebP)' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File size exceeds 5MB limit' },
      { status: 400 }
    );
  }

  try {
    const timestamp = Date.now();
    const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'jpg';
    const filename = `avatars/${session.user.id}-${timestamp}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
