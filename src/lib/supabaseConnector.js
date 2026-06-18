import { createClient } from '@supabase/supabase-js'
import { UpdateType } from '@powersync/web'

// --- Variables de entorno (configurar en .env) ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Conector que le dice a PowerSync cómo autenticarse y cómo
// enviar los cambios locales (escrituras) hacia Supabase.
export class SupabaseConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('No hay sesión activa')

    return {
      endpoint: POWERSYNC_URL,
      token: data.session.access_token
    }
  }

  // Se llama automáticamente cuando hay conexión y existen
  // cambios locales pendientes de subir (la "cola" de sync).
  async uploadData(database) {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    try {
      for (const op of transaction.ops) {
        const table = op.table
        const record = { ...op.opData, id: op.id }

        switch (op.op) {
          case UpdateType.PUT:
            await supabase.from(table).upsert(record)
            break
          case UpdateType.PATCH:
            await supabase.from(table).update(record).eq('id', op.id)
            break
          case UpdateType.DELETE:
            await supabase.from(table).delete().eq('id', op.id)
            break
        }
      }

      await transaction.complete()
    } catch (err) {
      console.error('Error subiendo cambios a Supabase:', err)
      // No se completa la transacción: PowerSync reintentará
      // automáticamente cuando vuelva la conexión.
      throw err
    }
  }
}
