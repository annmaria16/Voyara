import client from './client';

export const legalDocumentsApi = {
  // Get relationship options & dynamically allowed document types
  getRelationshipsAndTypes: async () => {
    const res = await client.get('/legal-documents/relationships-and-types');
    return res.data;
  },

  // Pre-submission live content validation
  validateDocumentContent: async (formData) => {
    const res = await client.post('/legal-documents/validate-content', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Provider: List all documents & versions for a property
  getProviderDocuments: async (propertyId) => {
    const res = await client.get(`/provider/properties/${propertyId}/documents`);
    return res.data;
  },

  // Provider: Upload new document or replacement version
  uploadDocument: async (propertyId, formData) => {
    const res = await client.post(`/provider/properties/${propertyId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Provider: Delete unlocked draft document
  deleteDocument: async (propertyId, documentId) => {
    const res = await client.delete(`/provider/properties/${propertyId}/documents/${documentId}`);
    return res.data;
  },

  // Admin: Get all documents for a property
  getAdminPropertyDocuments: async (propertyId) => {
    const res = await client.get(`/admin/legal-documents/property/${propertyId}`);
    return res.data;
  },

  // Admin: Review action (APPROVE, REQUEST_CHANGES, REJECT)
  reviewDocument: async (documentId, action, rejectionReason) => {
    const res = await client.post(`/admin/legal-documents/${documentId}/review`, {
      action,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  // Admin: Get summary metrics overview
  getAdminOverview: async () => {
    const res = await client.get('/admin/legal-documents/overview');
    return res.data;
  },
};

export default legalDocumentsApi;
