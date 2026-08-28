import { getApiToken } from '@/utils/auth';
import { isNativePlatform } from '@/lib/native';

const apiOrigin = () => process.env.NEXT_PUBLIC_API_URL || '';

export async function createReportExport(payload, format) {
  const token = await getApiToken();
  const response = await fetch(`${apiOrigin()}/api/exports/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, format }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Unable to create export');
  }
  const blob = await response.blob();
  const fallback = `${payload.kind || 'report'}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const header = response.headers.get('content-disposition') || '';
  const filename = header.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
  return { blob, filename };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareBlob(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title, files: [file] });
    return true;
  }
  if (isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const saved = await Filesystem.writeFile({ path: `exports/${filename}`, data: base64, directory: Directory.Cache, recursive: true });
      await Share.share({ title, files: [saved.uri] });
      return true;
    } catch (error) {
      console.warn('Native file sharing failed:', error);
    }
  }
  return false;
}
