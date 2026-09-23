import { useAuthStore } from '../stores/authStore';

export function usePermission(slug) {
  return useAuthStore((state) => state.can(slug));
}
