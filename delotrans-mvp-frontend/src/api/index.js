import axiosClient from './axiosClient';

export const clientsApi = {
  list: (params) => axiosClient.get('/clients', { params }),
  get: (id) => axiosClient.get(`/clients/${id}`),
  create: (data) => axiosClient.post('/clients', data),
  update: (id, data) => axiosClient.put(`/clients/${id}`, data),
  delete: (id) => axiosClient.delete(`/clients/${id}`),
};

export const categoriesApi = {
  list: () => axiosClient.get('/categories'),
  create: (data) => axiosClient.post('/categories', data),
};

export const searchApi = {
  documents: (params) => axiosClient.get('/search/documents', { params }),
};

export const dashboardApi = {
  stats: () => axiosClient.get('/dashboard/stats'),
  recentDocuments: () => axiosClient.get('/dashboard/recent-documents'),
};
