import { AppState, Role } from '@/types';

const STORAGE_KEY = 'logbook_fit_data';

export const storage = {
  get: (): AppState | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  set: (data: AppState): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  update: (updater: (state: AppState) => AppState): void => {
    const currentState = storage.get();
    if (currentState) {
      const newState = updater(currentState);
      storage.set(newState);
    }
  }
};

export const switchRole = (role: Role, userId: string): void => {
  storage.update(state => ({
    ...state,
    currentRole: role,
    currentUserId: userId
  }));
};
