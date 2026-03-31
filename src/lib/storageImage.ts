import { supabase } from '@/integrations/supabase/client';

const BLOG_IMAGES_PUBLIC_MARKER = '/storage/v1/object/public/blog-images/';
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 365;

function getBlogImagePathFromPublicUrl(url: string): string | null {
  const markerIndex = url.indexOf(BLOG_IMAGES_PUBLIC_MARKER);
  if (markerIndex === -1) return null;

  const encodedPath = url.slice(markerIndex + BLOG_IMAGES_PUBLIC_MARKER.length).split('?')[0];
  if (!encodedPath) return null;

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

export async function getBestBlogImageUrl(filePath: string): Promise<string> {
  const { data: signedData, error: signedError } = await supabase.storage
    .from('blog-images')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage.from('blog-images').getPublicUrl(filePath);
  return publicData.publicUrl;
}

export async function ensureBlogImageUrl(url: string, filePathHint?: string): Promise<string> {
  const filePath = filePathHint || getBlogImagePathFromPublicUrl(url);
  if (!filePath) return url;
  return getBestBlogImageUrl(filePath);
}
