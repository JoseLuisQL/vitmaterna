import { db } from './index';

export function initializeDatabase() {
  try {
    // Enable Write-Ahead Logging for better performance
    db.execSync('PRAGMA journal_mode = WAL;');

    // Create Gestantes table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS gestantes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        expected_due_date TEXT,
        blood_type TEXT,
        allergies TEXT,
        risk_level TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Create Appointments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL,
        gestante_id TEXT NOT NULL,
        date TEXT NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gestante_id) REFERENCES gestantes (id)
      );
    `);

    // Create Prenatal Controls table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS prenatal_controls (
        id TEXT PRIMARY KEY NOT NULL,
        gestante_id TEXT NOT NULL,
        date TEXT NOT NULL,
        gestational_weeks INTEGER,
        weight REAL,
        blood_pressure TEXT,
        fetal_heart_rate INTEGER,
        fundal_height REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gestante_id) REFERENCES gestantes (id)
      );
    `);

    // Create Treatments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY NOT NULL,
        gestante_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gestante_id) REFERENCES gestantes (id)
      );
    `);

    // Create Supplement Logs table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS supplement_logs (
        id TEXT PRIMARY KEY NOT NULL,
        gestante_id TEXT NOT NULL,
        treatment_id TEXT NOT NULL,
        taken_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (gestante_id) REFERENCES gestantes (id),
        FOREIGN KEY (treatment_id) REFERENCES treatments (id)
      );
    `);

    console.log('✅ Base de datos SQLite inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error inicializando base de datos SQLite:', error);
  }
}
