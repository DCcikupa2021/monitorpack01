// state filter + search Task page dibagikan ke export dan dipertahankan antar unmount
// (Task → detail → Task di-{#key page}, komponen remount tapi state module tetap hidup)
// visibleIds null = Task belum tampil → export semua
export const taskFilterState = { visibleIds: null, qs: null, selTypeTr: null, selDklk: null, selKirim: null, selAging: null, showNoPick: null }
