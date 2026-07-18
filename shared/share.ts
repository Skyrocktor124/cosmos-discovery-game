// Score/link sharing: native share sheet on mobile, clipboard fallback on desktop.
// Returns how the share was delivered so the UI can confirm ("Copied!").

export type ShareResult = 'shared' | 'copied' | 'failed';

export const shareText = async (text: string, url: string): Promise<ShareResult> => {
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return 'shared';
    }
  } catch {
    // user cancelled the sheet or share failed — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
};
