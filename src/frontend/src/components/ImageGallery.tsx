import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ImageGalleryProps {
  images: Uint8Array[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = () => {
      setLoading(true);
      const urls: string[] = [];
      
      for (const imageData of images) {
        try {
          // Convert Uint8Array to blob URL for display
          const blob = new Blob([new Uint8Array(imageData)], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          urls.push(url);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }
      
      setImageUrls(urls);
      setLoading(false);
    };

    if (images.length > 0) {
      loadImages();
    } else {
      setLoading(false);
    }

    // Cleanup function to revoke blob URLs
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (imageUrls.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <div className={`grid gap-4 ${
        imageUrls.length === 1 
          ? 'grid-cols-1' 
          : imageUrls.length === 2 
          ? 'grid-cols-2' 
          : 'grid-cols-2 md:grid-cols-3'
      }`}>
        {imageUrls.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted/30"
          >
            <img
              src={url}
              alt={`Bild ${index + 1}`}
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
