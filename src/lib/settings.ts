// Lectura de configuración (server-side)
import { qAll } from '@/db';
import type { PublicSettings, SettingsMap } from './types';

export function getSettingsMap(): SettingsMap {
  const rows = qAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: SettingsMap = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export function publicSettings(map: SettingsMap): PublicSettings {
  return {
    business_name: map.business_name || 'Distribuidora Central',
    tagline: map.tagline || '',
    whatsapp_phone: map.whatsapp_phone || '',
    address: map.address || '',
    hours: map.hours || '',
    min_order: map.min_order || '0',
    bank_info: map.bank_info || '',
    logo_url: map.logo_url || '',
    hero_image_url: map.hero_image_url || '/demo/hero.jpg',
  };
}
