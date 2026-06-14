import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// La base de datos local SQLite es una capa offline pensada solo para los
// dispositivos móviles (iOS/Android). En web, expo-sqlite usa un backend WASM
// que requiere SharedArrayBuffer (cabeceras COOP/COEP), por lo que
// `openDatabaseSync` lanza "ReferenceError: SharedArrayBuffer is not defined"
// y tumba toda la app antes de renderizar. Por eso evitamos abrirla en web.
export const db: SQLite.SQLiteDatabase | null =
  Platform.OS === 'web' ? null : SQLite.openDatabaseSync('vitmaterna.db');
