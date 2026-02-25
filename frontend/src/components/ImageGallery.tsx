import { useState, useEffect, useRef } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

interface ImageGalleryProps {
  images: Uint8Array[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  // Keep a ref to the current URLs so the cleanup always revokes the latest set
  const urlsRef = useRef<(string | null)[]>([]);

  useEffect(() => {
    setLoading(true);

    const urls: (string | null)[] = images.map((imageData) => {
      try {
        if (!imageData || imageData.length === 0) return null;
        const blob = new Blob([new Uint8Array(imageData)], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    });

    urlsRef.current = urls;
    setImageUrls(urls);
    setLoading(false);

    return () => {
      urlsRef.current.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      urlsRef.current = [];
    };
  }, [images]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const validUrls = imageUrls.filter(Boolean);
  if (validUrls.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <div
        className={`grid gap-4 ${
          imageUrls.length === 1
            ? 'grid-cols-1'
            : imageUrls.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {imageUrls.map((url, index) =>
          url ? (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted/30"
            >
              <img
                src={url}
                alt={`Bild ${index + 1}`}
                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                loading="lazy"
                onError={(e) => {
                  // Replace broken image with placeholder
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.img-placeholder')) {
                    const placeholder = document.createElement('div');
                    placeholder.className =
                      'img-placeholder w-full h-full flex flex-col items-center justify-center text-muted-foreground';
                    placeholder.innerHTML =
                      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                    parent.appendChild(placeholder);
                  }
                }}
              />
            </div>
          ) : (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground"
            >
              <ImageOff className="h-8 w-8 mb-1" />
              <span className="text-xs">Bild ej tillgänglig</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
