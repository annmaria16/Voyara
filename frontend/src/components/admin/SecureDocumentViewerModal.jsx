import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ExternalLink,
  Loader2,
  Calendar,
  Building,
  User,
  Hash,
  Sparkles,
  Lock,
  Clock,
  Eye,
  AlertOctagon,
} from 'lucide-react';
import client from '../../api/client';
import { legalDocumentsApi } from '../../api/legalDocuments';

export const SecureDocumentViewerModal = ({
  documentId,
  propertyName = 'Property',
  isOpen,
  onClose,
  onVerificationChange,
}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, action: null });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let currentBlob = null;
    if (isOpen && documentId) {
      loadDocumentBlob();
    }
    return () => {
      if (currentBlob) {
        URL.revokeObjectURL(currentBlob);
      }
    };
  }, [isOpen, documentId]);

  const loadDocumentBlob = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await client.get(`/admin/legal-documents/${documentId}/view`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setBlobUrl(url);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to stream secure document.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (action) => {
    setActionLoading(true);
    setError('');
    try {
      await legalDocumentsApi.reviewDocument(documentId, action, notes || undefined);
      setActionModal({ open: false, action: null });
      setNotes('');
      if (onVerificationChange) {
        onVerificationChange();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit document review.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-[#091B29] border border-slate-700/80 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B2133] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#27B7A8]">
                  Voyara Secure Legal Document Stream
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 inline mr-1" />
                  Audit Logged Stream
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-lg mt-0.5">
                {propertyName} — Legal Document #{documentId}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-xl transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (PDF Viewer) */}
        <div className="flex-1 bg-slate-950/80 relative overflow-hidden flex flex-col items-center justify-center">
          {error && (
            <div className="p-4 mx-6 my-auto bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl max-w-md text-center text-xs space-y-2">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={loadDocumentBlob}
                className="px-3 py-1 bg-rose-900/50 hover:bg-rose-900 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {loading && !error && (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#27B7A8] animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Decrypting & Streaming Document...</p>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0`}
              title="Secure Legal Document Stream"
              className="w-full h-full border-0"
            />
          )}
        </div>

        {/* Footer / Review Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0B2133] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Review the PDF against the claimed relationship & declared property address before approving.</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setActionModal({ open: true, action: 'REJECT' })}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs border border-rose-500/30 transition-all cursor-pointer"
            >
              Reject Document
            </button>

            <button
              type="button"
              onClick={() => setActionModal({ open: true, action: 'REQUEST_CHANGES' })}
              disabled={actionLoading}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
            >
              Request Changes
            </button>

            <button
              type="button"
              onClick={() => setActionModal({ open: true, action: 'APPROVE' })}
              disabled={actionLoading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            >
              Approve Document
            </button>
          </div>
        </div>

      </div>

      {/* ACTION CONFIRMATION MODAL */}
      {actionModal.open && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0F273D] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white">
              {actionModal.action === 'APPROVE' && 'Approve & Lock Legal Document'}
              {actionModal.action === 'REQUEST_CHANGES' && 'Request Stay Partner Corrections'}
              {actionModal.action === 'REJECT' && 'Reject Legal Document'}
            </h4>

            <p className="text-xs text-slate-300">
              {actionModal.action === 'APPROVE'
                ? 'Approving locks this legal document and authorizes the property for listing.'
                : 'Provide the specific reason or requested changes for the Stay Partner.'}
            </p>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter review notes or required modifications..."
              className="w-full p-3 bg-[#091B29] border border-slate-700 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-teal-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ open: false, action: null })}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction(actionModal.action)}
                disabled={actionLoading}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-[#087F8C] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SecureDocumentViewerModal;
