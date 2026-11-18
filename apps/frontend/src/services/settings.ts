import { http } from './http';

export interface RestaurantSettings {
  totalTables: number;
}

export const getSettings = () => http.get<RestaurantSettings>('/settings');

export const updateSettings = (totalTables: number) =>
  http.patch<RestaurantSettings>('/settings', { totalTables });
