import React, { useState, useEffect, useRef } from 'react';
import { legalDocumentsApi } from '../../api/legalDocuments';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Info,
  Lock,
  FileCheck,
  AlertCircle,
  Plus,
  Calendar,
  Layers,
} from 'lucide-react';

const FALLBACK_RELATIONSHIPS = [
  {
    relationship: 'PROPERTY_OWNER',
    label: 'Property Owner',
    description: 'I am the lawful owner of this property.',
    allowed_document_types: [
      { type: 'SALE_DEED', label: 'Registered Sale Deed' },
      { type: 'PROPERTY_OWNERSHIP_DEED', label: 'Property Ownership Deed' },
      { type: 'LAND_RECORD', label: 'Land / Property Record' },
      { type: 'BUILDING_REGISTRATION', label: 'Property Registration Certificate' },
      { type: 'PROPERTY_TAX_RECEIPT', label: 'Property Tax Record / Receipt' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Other Accepted Ownership Document' },
    ],
  },
  {
    relationship: 'LEASEHOLDER_TENANT',
    label: 'Leaseholder / Tenant',
    description: 'I hold a valid lease or tenancy agreement.',
    allowed_document_types: [
      { type: 'LEASE_AGREEMENT', label: 'Registered Lease Agreement' },
      { type: 'RENT_AGREEMENT', label: 'Registered Rent Agreement' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Valid Tenancy / Occupancy Agreement' },
    ],
  },
  {
    relationship: 'AUTHORIZED_PROPERTY_MANAGER',
    label: 'Authorized Property Manager',
    description: 'I am appointed/authorized by the owner to manage this property.',
    allowed_document_types: [
      { type: 'MANAGEMENT_AUTHORIZATION', label: 'Property Management Authorization' },
      { type: 'AUTHORIZATION_LETTER', label: 'Authorization Letter from Owner' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Management Contract' },
    ],
  },
  {
    relationship: 'BUSINESS_ESTABLISHMENT_OPERATOR',
    label: 'Business / Establishment Operator',
    description: 'The property is operated by a registered commercial entity.',
    allowed_document_types: [
      { type: 'BUSINESS_REGISTRATION', label: 'Business Registration / Establishment Certificate' },
      { type: 'BUILDING_REGISTRATION', label: 'Trade / Establishment Registration' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Business-related Property Authorization' },
    ],
  },
  {
    relationship: 'PARTNERSHIP_CO_OWNER',
    label: 'Partnership / Co-owner',
    description: 'The property is owned by a partnership firm or jointly.',
    allowed_document_types: [
      { type: 'PARTNERSHIP_DEED', label: 'Partnership Deed' },
      { type: 'PROPERTY_OWNERSHIP_DEED', label: 'Registered Partnership Document / Co-ownership' },
      { type: 'AUTHORIZATION_LETTER', label: 'Authorization from Co-owner(s)' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Other Accepted Partnership Document' },
    ],
  },
  {
    relationship: 'AUTHORIZED_REPRESENTATIVE',
    label: 'Authorized Representative',
    description: 'I have power of attorney or specific written authorization.',
    allowed_document_types: [
      { type: 'AUTHORIZATION_LETTER', label: 'Authorization Letter' },
      { type: 'MANAGEMENT_AUTHORIZATION', label: 'Power of Attorney / Property Authorization' },
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Owner Authorization Document' },
    ],
  },
  {
    relationship: 'OTHER_LEGAL_AUTHORITY',
    label: 'Other Legal Authority',
    description: 'Other legally recognized authority to operate the property.',
    allowed_document_types: [
      { type: 'OTHER_LEGAL_PROPERTY_DOCUMENT', label: 'Other Legal Property Document' },
      { type: 'AUTHORIZATION_LETTER', label: 'Authorization Letter' },
      { type: 'PROPERTY_OWNERSHIP_DEED', label: 'Supporting Property Deed' },
    ],
  },
];

export const PropertyLegalDocumentsSection = ({ propertyId, onDocumentsChange }) => {
  const [relationships, setRelationships] = useState(FALLBACK_RELATIONSHIPS);
  const [documents, setDocuments] = useState([]);
  const [selectedRel, setSelectedRel] = useState('PROPERTY_OWNER');
  const [selectedType, setSelectedType] = useState('PROPERTY_OWNERSHIP_DEED');
  const [selectedFile, setSelectedFile] = useState(null);
  const [validityUntil, setValidityUntil] = useState('');
  const [isManualDate, setIsManualDate] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const data = await legalDocumentsApi.getRelationshipsAndTypes();
        if (Array.isArray(data) && data.length > 0) {
          setRelationships(data);
        }
      } catch (err) {
        // Fallback
      }
    };
    fetchTypes();
  }, []);

  const loadDocuments = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError('');
    try {
      const data = await legalDocumentsApi.getProviderDocuments(propertyId);
      setDocuments(Array.isArray(data) ? data : []);
      if (onDocumentsChange) onDocumentsChange(data);
    } catch (err) {
      console.error('Failed to load legal documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      loadDocuments();
    }
  }, [propertyId]);

  const currentRelConfig = relationships.find((r) => r.relationship === selectedRel) || relationships[0];

  const handleRelChange = (newRel) => {
    setSelectedRel(newRel);
    const config = relationships.find((r) => r.relationship === newRel) || relationships[0];
    setSelectedType(config.allowed_document_types[0]?.type || 'PROPERTY_OWNERSHIP_DEED');
  };

  const handleFileSelect = (e) => {
    setError('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid file format. Legal verification documents must be uploaded ONLY as PDF.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Please upload a valid PDF document up to 10 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!propertyId) return;
    if (!selectedFile) {
      setError('Please select a valid PDF document to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('legal_relationship', selectedRel);
      formData.append('document_type', selectedType);
      if (validityUntil) {
        formData.append('manual_expiry_date', validityUntil);
        formData.append('is_manual_date', isManualDate ? 'true' : 'false');
      }

      await legalDocumentsApi.uploadDocument(propertyId, formData);
      setSuccessMsg(`"${selectedFile.name}" successfully uploaded and queued for administrative review.`);
      setSelectedFile(null);
      setValidityUntil('');
      setShowUploadModal(false);
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to upload legal document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to remove "${docName}"?`)) return;
    try {
      await legalDocumentsApi.deleteDocument(propertyId, docId);
      await loadDocuments();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete document.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (doc) => {
    switch (doc.overall_status) {
      case 'ADMIN_APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Approved & Locked</span>
          </span>
        );
      case 'DOCUMENT_EXPIRED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Document Expired</span>
          </span>
        );
      case 'ADMIN_REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected by Admin</span>
          </span>
        );
      case 'NEEDS_REVIEW':
      case 'REUPLOAD_REQUIRED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Corrections Required</span>
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30">
            <span>Historical Version</span>
          </span>
        );
      case 'READY_FOR_ADMIN_REVIEW':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>Pending Admin Review</span>
          </span>
        );
    }
  };

  const activeDoc = documents.find((d) => d.is_active_version);

  return (
    <div id="legal-docs-section" className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#087F8C] dark:text-[#27B7A8]">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#091B29] dark:text-white">
              Property Legal Verification & Validity
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl font-light leading-relaxed">
            Legal documents prove your right to list and operate this stay. Approved documents are locked and managed automatically with expiry reminders.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Replacement / New Version</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-serif font-bold text-base">
                <Upload className="w-4 h-4 text-orange-500" />
                <span>Upload Legal Verification Document</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Legal Relationship *
                </label>
                <select
                  value={selectedRel}
                  onChange={(e) => handleRelChange(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {relationships.map((rel) => (
                    <option key={rel.relationship} value={rel.relationship}>
                      {rel.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Document Type *
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {currentRelConfig.allowed_document_types.map((dt) => (
                    <option key={dt.type} value={dt.type}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Upload PDF (Max 10 MB) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="w-full p-2 bg-white dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300"
                />
                {selectedFile && (
                  <div className="mt-2 flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                      title="Remove selected file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Document Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  value={validityUntil}
                  onChange={(e) => {
                    setValidityUntil(e.target.value);
                    setIsManualDate(true);
                  }}
                  className="w-full p-2.5 bg-white dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Version List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span>Document Versions ({documents.length})</span>
          </h3>
          <button
            type="button"
            onClick={loadDocuments}
            className="text-[11px] font-semibold text-slate-500 hover:text-orange-500 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No legal documents submitted yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-light">
              Submit required ownership or authorization documents to enable Control Center verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl border transition-all ${
                  doc.is_active_version
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                } flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                        v{doc.version_number}
                      </span>
                      <strong className="text-xs font-bold text-[#091B29] dark:text-white">
                        {doc.document_type_label || doc.document_type}
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        ({doc.legal_relationship_label || doc.legal_relationship})
                      </span>
                      {getStatusBadge(doc)}
                      {doc.is_locked && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          <Lock className="w-2.5 h-2.5 text-orange-500" />
                          <span>Immutable</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {doc.original_filename} • {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {doc.document_expiry_date && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Valid Until: {new Date(doc.document_expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                    )}
                    {doc.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] mt-1 space-y-0.5">
                        <span className="font-bold block">Reviewer Feedback:</span>
                        <p>{doc.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 sm:self-center">
                  {!doc.is_locked && doc.overall_status !== 'ADMIN_APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.original_filename)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove draft document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
        <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
          <Info className="w-3.5 h-3.5 text-orange-500" />
          <span>Administrative Verification Notice</span>
        </div>
        <p>
          Uploaded documents are reviewed solely for internal Voyara platform listing verification. Verification approves the property for platform listing and does not constitute a public warranty of title.
        </p>
      </div>
    </div>
  );
};

export default PropertyLegalDocumentsSection;
