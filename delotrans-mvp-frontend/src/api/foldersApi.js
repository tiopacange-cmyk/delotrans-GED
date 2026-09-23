import axiosClient from './axiosClient';

export const foldersApi = {
  list: (parentId) => axiosClient.get('/folders', { params: { parent_id: parentId } }),
  get: (id) => axiosClient.get(`/folders/${id}`),
  create: (data) => axiosClient.post('/folders', data),
  update: (id, data) => axiosClient.put(`/folders/${id}`, data),
  move: (id, parentId) => axiosClient.put(`/folders/${id}/move`, { parent_id: parentId }),
  delete: (id) => axiosClient.delete(`/folders/${id}`),
  breadcrumb: (id) => axiosClient.get(`/folders/${id}/breadcrumb`),
};
