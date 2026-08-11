import React, { useEffect, useState } from 'react';
import { getAsset } from '../db';

/** Load a stored blob and hand back an object URL, revoking it on unmount. */
export const useAssetUrl = (id?: string): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;
    getAsset(id).then(asset => {
      if (!asset || revoked) return;
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [id]);

  return url;
};

interface Props {
  id?: string;
  alt: string;
  className?: string;
}

const AssetImage: React.FC<Props> = ({ id, alt, className }) => {
  const url = useAssetUrl(id);
  if (!url) return <div className={`${className ?? ''} animate-pulse bg-slate-200`} />;
  return <img src={url} alt={alt} className={className} />;
};

export default AssetImage;
