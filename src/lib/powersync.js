import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema'
import { SupabaseConnector } from './supabaseConnector'

// Base de datos local (SQLite vía wa-sqlite + IndexedDB).
// Funciona completamente offline; se sincroniza con Supabase
// automáticamente cuando hay conexión.
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'deudas.db'
  }
})

export const connector = new SupabaseConnector()

export async function initPowerSync() {
  await db.init()
  await db.connect(connector)
}
