import axiosClient from './axiosClient';

export const documentsApi = {
  list: (params) => axiosClient.get('/documents', { params }),
  get: (id) => axiosClient.get(`/documents/${id}`),
  upload: (formData) =>
    axiosClient.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, data) => axiosClient.put(`/documents/${id}`, data),
  delete: (id) => axiosClient.delete(`/documents/${id}`),
  downloadUrl: (id) => `${import.meta.env.VITE_API_URL}/documents/${id}/download`,
};
