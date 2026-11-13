import { supabase } from './supabase.js'

// Satu reason per shipment_id + no_item + location.
// comment = komentar asli dari packing_reports; reason = isi textarea bebas.
export async function saveReason({
  shipmentId,
  store,
  trFull,
  typeTr,
  noItem,
  itemName,
  qty,
  dkLk,
  location,
  user,
  comment,
  reasonText
}) {
  const { error } = await supabase.from('reasons').upsert(
    {
      shipment_id: shipmentId ?? null,
      store: store ?? null,
      tr_full: trFull ?? null,
      type_tr: typeTr ?? null,
      no_item: noItem ?? null,
      item_name: itemName ?? null,
      qty: qty ?? null,
      dk_lk: dkLk ?? null,
      location: location ?? null,
      user_name: user ?? null,
      comment: comment ?? null,
      reason: reasonText
    },
    { onConflict: 'shipment_id,no_item,location' }
  )
  return { error }
}

export async function deleteReason(id) {
  const { error } = await supabase.from('reasons').delete().eq('id', id)
  return { error }
}

export async function fetchReasons() {
  const { data, error } = await supabase
    .from('reasons')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}
