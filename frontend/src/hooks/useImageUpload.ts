import { useState, useCallback } from 'react';

interface ImageFile {
  file: File;
  preview: string;
  uploadProgress: number;
  compressedBytes?: Uint8Array;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_TYPES_LABEL = 'JPEG, PNG, WebP eller GIF';
const MAX_FILE_SIZE_MB = 10;
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Compress and resize an image file using the Canvas API.
 * Returns a Uint8Array of the compressed JPEG, and a blob URL for preview.
 */
async function compressImage(file: File): Promise<{ bytes: Uint8Array; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    if (file.size === 0) {
      reject(new Error('Filen är tom eller skadad.'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width === 0 || height === 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Bilden har ogiltiga dimensioner.'));
        return;
      }

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
        reject(new Error('Kunde inte skapa canvas-kontext. Försök med en annan bild.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            reject(new Error('Bildkomprimering misslyckades. Försök med en annan bild.'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          blob
            .arrayBuffer()
            .then((buf) => {
              const bytes = new Uint8Array(buf);
              if (bytes.length === 0) {
                URL.revokeObjectURL(previewUrl);
                reject(new Error('Konvertering av bild misslyckades. Försök igen.'));
                return;
              }
              resolve({ bytes, previewUrl });
            })
            .catch(() => {
              URL.revokeObjectURL(previewUrl);
              reject(new Error('Kunde inte läsa bilddata. Försök med en annan bild.'));
            });
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunde inte läsa in bilden. Kontrollera att filen inte är skadad.'));
    };

    img.src = objectUrl;
  });
}

export function useImageUpload() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateImageFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Filtypen "${file.type || 'okänd'}" stöds inte. Använd ${ACCEPTED_TYPES_LABEL}.`;
    }
    if (file.size === 0) {
      return 'Filen är tom. Välj en giltig bildfil.';
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Bilden är för stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximal storlek är ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const addImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setIsProcessing(true);

    const fileArray = Array.from(files);
    const errors: string[] = [];

    for (const file of fileArray) {
      const validationError = validateImageFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Okänt fel vid bildbearbetning.';
        errors.push(`${file.name}: ${message}`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    setIsProcessing(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index]) {
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
      }
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
      if (!bytes || bytes.length === 0) continue;

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
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    images,
    error,
    isProcessing,
    addImages,
    removeImage,
    convertToBlobs,
    clearImages,
  };
}
