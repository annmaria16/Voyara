import React, { useState, useRef } from 'react';
import { uploadApi } from '../../api/upload';
import { resolveImageUrl } from '../../utils/imageUrl';
import { FileText, Upload, X, Loader2, CheckCircle2, ShieldAlert, FileCheck, Eye } from 'lucide-react';

export const DocumentUploadPicker = ({
  value = '',
  onChange = () => {},
  label = 'Property Ownership / Authorization Proof *',
  hint = 'Upload a document that proves you own or are authorized to manage this property. This document is visible only to Voyara administrators.',
  required = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setDocName(file.name);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Document file size must be less than 10MB.');
      setUploading(false);
      return;
    }

    try {
      const res = await uploadApi.uploadDocument(file);
      onChange(res.url);
    } catch (err) {
      console.error('Document upload failed:', err);
      setError(err.message || 'Failed to upload verification document. Supported formats: PDF, JPG, PNG.');
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
    setDocName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPdf = value.toLowerCase().endsWith('.pdf') || docName.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          {label}
        </label>
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <ShieldAlert className="w-3 h-3" />
          <span>Admin Confidential</span>
        </span>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        {hint}
      </p>

      {value ? (
        <div className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 transition-all flex items-center justify-between">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              {isPdf ? <FileText className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {docName || value.split('/').pop()}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                ✓ Document uploaded securely • Verified format ({isPdf ? 'PDF Document' : 'Image Proof'})
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={resolveImageUrl(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
              title="Preview Document"
            >
              <Eye className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 shadow-xs transition-colors cursor-pointer"
              title="Remove and upload different document"
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
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 dark:border-slate-700 bg-[#FFF8F0]/50 dark:bg-slate-900/60 hover:border-emerald-500 dark:hover:border-emerald-400'
          }`}
        >
          {uploading ? (
            <div className="py-4 flex flex-col items-center space-y-2">
              <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
              <p className="text-xs font-semibold text-[#102A43] dark:text-slate-200">
                Encrypting and uploading ownership proof to Voyara server...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Click to select or drag & drop Ownership Proof (PDF, JPG, PNG)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Electricity bill, deed/lease agreement, tax receipt, or property registration certificate (Max 10MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
