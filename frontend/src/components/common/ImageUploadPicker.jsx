import React, { useState, useRef } from 'react';
import { uploadApi } from '../../api/upload';
import { resolveImageUrl } from '../../utils/imageUrl';
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react';

export const ImageUploadPicker = ({
  value = '',
  onChange = () => {},
  label = 'Upload Image',
  hint = 'Supports JPEG, PNG, WebP up to 10MB',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [blobPreview, setBlobPreview] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    const tempPreview = URL.createObjectURL(file);
    setBlobPreview(tempPreview);

    try {
      const res = await uploadApi.uploadImage(file);
      onChange(res.url);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Failed to upload image. Please try again.');
      setBlobPreview(null);
      URL.revokeObjectURL(tempPreview);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    if (blobPreview) {
      URL.revokeObjectURL(blobPreview);
      setBlobPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displaySrc = blobPreview || resolveImageUrl(value);

  return (
    <div className="space-y-1.5 select-none">
      {label && (
        <label className="block text-xs font-semibold text-[#102A43] dark:text-slate-200">
          {label}
        </label>
      )}

      {value || blobPreview ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-16/9 bg-slate-100 dark:bg-slate-900 group">
          <img
            src={displaySrc}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              if (value && !value.startsWith('http')) {
                const clean = value.startsWith('/') ? value : `/${value}`;
                e.target.src = `http://localhost:8000${clean}`;
              }
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 text-xs font-bold text-slate-900 dark:text-white rounded-xl shadow-md hover:bg-white transition-all"
            >
              Replace Photo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md transition-all"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            dragOver
              ? 'border-[#F97360] bg-[#F97360]/5 dark:bg-[#F97360]/10'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131D2E] hover:border-emerald-500 dark:hover:border-emerald-400'
          }`}
        >
          {uploading ? (
            <div className="py-4 flex flex-col items-center space-y-2">
              <Loader2 className="w-7 h-7 text-[#F97360] animate-spin" />
              <p className="text-xs font-semibold text-[#102A43] dark:text-slate-200">
                Uploading photo to Voyara storage...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                  Click or drag photo here to upload
                </p>
                {hint && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {hint}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-rose-500 mt-1">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploadPicker;
