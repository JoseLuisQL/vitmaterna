import * as SQLite from 'expo-sqlite';

// Inicializa la base de datos de manera sincrónica. 
// Esto crea o abre 'vitmaterna.db' en el directorio de la aplicación.
export const db = SQLite.openDatabaseSync('vitmaterna.db');
