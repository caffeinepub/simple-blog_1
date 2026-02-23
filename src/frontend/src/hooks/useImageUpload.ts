import { useState, useCallback } from 'react';

interface ImageFile {
  file: File;
  preview: string;
  uploadProgress: number;
}

export function useImageUpload() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Endast bildformat (PNG, JPG, JPEG, GIF, WEBP) är tillåtna');
      return false;
    }
    
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError('Bilden är för stor. Maximal storlek är 10MB');
      return false;
    }
    
    return true;
  };

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    
    setError(null);
    const newImages: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (validateImageFile(file)) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          uploadProgress: 0,
        });
      }
    });
    
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  const convertToBlobs = useCallback(async (): Promise<Uint8Array[]> => {
    const blobs: Uint8Array[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const arrayBuffer = await image.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      blobs.push(uint8Array);
      
      // Update progress
      setImages((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], uploadProgress: 100 };
        return updated;
      });
    }
    
    return blobs;
  }, [images]);

  const clearImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setError(null);
  }, [images]);

  return {
    images,
    error,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
  };
}
