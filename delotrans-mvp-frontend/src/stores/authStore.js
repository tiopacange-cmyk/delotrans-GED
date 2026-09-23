import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],

      setSession: (user, token) =>
        set({
          user,
          token,
          permissions: user.role?.permissions?.map((p) => p.slug) ?? [],
        }),

      logout: () => set({ user: null, token: null, permissions: [] }),

      isAuthenticated: () => !!get().token,

      can: (permissionSlug) => get().permissions.includes(permissionSlug),
    }),
    { name: 'delotrans-auth' }
  )
);
