export type RestaurantSettings = { totalTables: number };

export abstract class SettingsRepository {
  // Sem nada salvo, devolve o padrão (30 mesas)
  abstract get(): Promise<RestaurantSettings>;
  abstract save(settings: RestaurantSettings): Promise<void>;
}
