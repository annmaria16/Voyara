import React, { useState, useRef } from 'react';
import { uploadApi } from '../../api/upload';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';

export const MultiImageUploadPicker = ({
  images = [],
  onChange = () => {},
  label = 'Upload Photos',
  hint = 'Supports JPG, JPEG, PNG, WebP (up to 10MB per image)',
  maxPhotos = 12,
  required = false,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState([]); // [{ tempId, progress, error, name, preview }]
  const [generalError, setGeneralError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const previewBlobMapRef = useRef({});

  const getImgSrc = (img) => {
    if (!img) return '';
    const raw = typeof img === 'string' ? img : (img.image_url || img.url || '');
    if (!raw) return '';
    // If we have an active local blob URL cached for this image during the current session, return it
    if (previewBlobMapRef.current && previewBlobMapRef.current[raw]) {
      return previewBlobMapRef.current[raw];
    }
    return resolveImageUrl(raw);
  };

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setGeneralError('');

    const filesArray = Array.from(fileList);
    const availableSlots = maxPhotos - images.length;

    if (availableSlots <= 0) {
      setGeneralError(`Maximum limit of ${maxPhotos} photos reached.`);
      return;
    }

    const filesToUpload = filesArray.slice(0, availableSlots);

    // Validate file types - support JPG, JPEG, PNG, WebP, GIF
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/x-png',
      'image/webp',
      'image/gif'
    ];
    const invalidFiles = filesToUpload.filter((f) => {
      const mime = (f.type || '').toLowerCase();
      const isMimeValid = validMimeTypes.includes(mime);
      const isExtValid = /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name || '');
      return !isMimeValid && !isExtValid;
    });

    if (invalidFiles.length > 0) {
      setGeneralError('Invalid image format detected. Allowed formats: JPG, JPEG, PNG, WebP.');
      return;
    }

    let currentImages = images
      .map((img) => (typeof img === 'string' ? img : (img.image_url || img.url || '')))
      .filter(Boolean);

    for (const file of filesToUpload) {
      const tempId = `${Date.now()}_${Math.random()}`;
      const tempPreview = URL.createObjectURL(file);

      setUploadingFiles((prev) => [
        ...prev,
        { tempId, preview: tempPreview, name: file.name, loading: true },
      ]);

      try {
        const res = await uploadApi.uploadImage(file);
        if (res && res.url) {
          // Cache the blob preview for instant rendering without reload flicker
          previewBlobMapRef.current[res.url] = tempPreview;
          currentImages = [...currentImages, res.url];
          onChange(currentImages);
        }
      } catch (err) {
        console.error('Image upload failed:', err);
        setGeneralError(`Failed to upload ${file.name}: ${err.message || 'Server upload error'}`);
        URL.revokeObjectURL(tempPreview);
      } finally {
        setUploadingFiles((prev) => prev.filter((item) => item.tempId !== tempId));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index) => {
    const clean = images
      .map((img) => (typeof img === 'string' ? img : (img.image_url || img.url || '')))
      .filter(Boolean);
    const removedUrl = clean[index];
    if (removedUrl && previewBlobMapRef.current[removedUrl]) {
      URL.revokeObjectURL(previewBlobMapRef.current[removedUrl]);
      delete previewBlobMapRef.current[removedUrl];
    }
    const updated = clean.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPrimary = (index) => {
    if (index === 0) return;
    const clean = images
      .map((img) => (typeof img === 'string' ? img : (img.image_url || img.url || '')))
      .filter(Boolean);
    const selected = clean[index];
    const rest = clean.filter((_, i) => i !== index);
    onChange([selected, ...rest]);
  };

  return (
    <div className="space-y-3 select-none">
      {/* Label and Count Header */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {images.length} of {maxPhotos} max photos
        </span>
      </div>

      {/* Upload Drag & Drop Zone */}
      {images.length < maxPhotos && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
            dragOver
              ? 'border-[#F97360] bg-[#F97360]/10 dark:bg-[#F97360]/15 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131D2E] hover:border-[#F97360] hover:bg-[#FFF8F0]/40 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#F97360] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Click or drag & drop JPG, JPEG, PNG, or WebP photos
              </p>
              {hint && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {hint}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {generalError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Uploading In-progress Thumbnails & Uploaded Thumbnails Grid */}
      {(images.length > 0 || uploadingFiles.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Uploaded Photos */}
          {images.map((imgItem, idx) => {
            const isPrimary = idx === 0;
            const imgSrc = getImgSrc(imgItem);
            return (
              <div
                key={idx}
                className={`relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 group border transition-all ${
                  isPrimary
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <img
                  src={imgSrc}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If relative URL failed, retry with absolute backend origin
                    const raw = typeof imgItem === 'string' ? imgItem : (imgItem.image_url || imgItem.url || '');
                    if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
                      const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
                      e.target.src = `http://localhost:8000${cleanPath}`;
                    }
                  }}
                />

                {/* Primary Tag */}
                {isPrimary && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold shadow-md flex items-center space-x-1">
                    <Star className="w-2.5 h-2.5 fill-white" />
                    <span>Cover Photo</span>
                  </div>
                )}

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="px-2 py-1 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-[10px] font-bold shadow-md transition-all flex items-center space-x-1 cursor-pointer"
                      title="Set as primary cover photo"
                    >
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>Set Cover</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-all cursor-pointer"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Uploading In-progress Placeholders with live preview */}
          {uploadingFiles.map((up) => (
            <div
              key={up.tempId}
              className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-900 border border-orange-500/50 flex flex-col items-center justify-center p-2 text-white"
            >
              <img
                src={up.preview}
                alt="Uploading preview"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="relative z-10 flex flex-col items-center space-y-1 text-center bg-black/60 px-3 py-2 rounded-xl backdrop-blur-xs">
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                <span className="text-[10px] font-bold tracking-tight text-white line-clamp-1">
                  Uploading {up.name}...
                </span>
              </div>
            </div>
          ))}

          {/* "+ Add More" Quick Button */}
          {images.length > 0 && images.length < maxPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-16/10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#F97360] dark:hover:border-[#F97360] bg-[#FFF8F0]/30 dark:bg-slate-900/30 flex flex-col items-center justify-center space-y-1 text-slate-500 dark:text-slate-400 hover:text-[#F97360] transition-colors cursor-pointer"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[11px] font-bold">Add More</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif,image/jpg"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
        className="hidden"
      />
    </div>
  );
};

export default MultiImageUploadPicker;
