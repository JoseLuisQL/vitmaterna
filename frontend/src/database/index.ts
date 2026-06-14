import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

/**
 * Base de datos SQLite local (caché offline).
 *
 * En **web**, expo-sqlite requiere `SharedArrayBuffer`, que a su vez exige
 * cabeceras COOP/COEP que el servidor de desarrollo no envía → rompe la app.
 * Por eso la apertura es **perezosa** y se omite en web: el núcleo de la app
 * funciona contra la API REST, no contra SQLite.
 */
type DB = ReturnType<typeof SQLite.openDatabaseSync>;

let _db: DB | null = null;

/** Devuelve la instancia de SQLite, abriéndola la primera vez. Null en web o si falla. */
export function getDb(): DB | null {
  if (Platform.OS === 'web') return null;
  if (_db) return _db;
  try {
    _db = SQLite.openDatabaseSync('vitmaterna.db');
    return _db;
  } catch (error) {
    console.warn('SQLite no disponible:', error);
    return null;
  }
}
