import { createClient } from '@supabase/supabase-js'
import { UpdateType } from '@powersync/web'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export class SupabaseConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('No hay sesion activa')

    return {
      endpoint: POWERSYNC_URL,
      token: data.session.access_token
    }
  }

  async uploadData(database) {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    try {
      for (const op of transaction.crud) {
        const table = op.table
        // op.opData contiene los campos; op.id es el uuid del registro
        const record = { ...op.opData, id: op.id }

        let result

        if (op.op === UpdateType.PUT) {
          // INSERT via upsert — todos los campos incluyendo user_id
          result = await supabase.from(table).upsert(record)
        } else if (op.op === UpdateType.PATCH) {
          // UPDATE — solo los campos modificados
          result = await supabase.from(table).update(op.opData).eq('id', op.id)
        } else if (op.op === UpdateType.DELETE) {
          result = await supabase.from(table).delete().eq('id', op.id)
        }

        // Verificar error de Supabase por cada operacion
        if (result?.error) {
          console.error('Supabase error en', op.op, table, result.error)
          throw new Error(result.error.message)
        }
      }

      await transaction.complete()
    } catch (err) {
      console.error('uploadData error — PowerSync reintentara:', err)
      throw err
    }
  }
}
