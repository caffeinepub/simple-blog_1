import { useState, useCallback } from 'react';

interface ImageFile {
  file: File;
  preview: string;
  uploadProgress: number;
  compressedBytes?: Uint8Array;
}

/**
 * Compress and resize an image file using the Canvas API.
 * Returns a Uint8Array of the compressed JPEG, and a blob URL for preview.
 */
async function compressImage(file: File): Promise<{ bytes: Uint8Array; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_SIDE = 1024;
      let { width, height } = img;

      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width >= height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          blob.arrayBuffer().then((buf) => {
            resolve({ bytes: new Uint8Array(buf), previewUrl });
          });
        },
        'image/jpeg',
        0.75,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

export function useImageUpload() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only image formats (PNG, JPG, JPEG, GIF, WEBP) are allowed');
      return false;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 10MB');
      return false;
    }

    return true;
  };

  const addImages = useCallback(async (files: FileList | null) => {
    if (!files) return;

    setError(null);

    for (const file of Array.from(files)) {
      if (!validateImageFile(file)) continue;

      try {
        const { bytes, previewUrl } = await compressImage(file);
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: previewUrl,
            uploadProgress: 0,
            compressedBytes: bytes,
          },
        ]);
      } catch {
        setError('Failed to process image. Please try another file.');
      }
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  /**
   * Return compressed image bytes as Uint8Array[] for the backend.
   */
  const convertToBlobs = useCallback(async (): Promise<Uint8Array[]> => {
    const results: Uint8Array[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const bytes = image.compressedBytes;
      if (!bytes) continue;

      results.push(bytes);

      setImages((prev) => {
        const updated = [...prev];
        if (updated[i]) {
          updated[i] = { ...updated[i], uploadProgress: 100 };
        }
        return updated;
      });
    }

    return results;
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
