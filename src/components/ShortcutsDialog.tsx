interface ShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="shortcut-kbd">{children}</kbd>
}

function ShortcutRow({ keys, desc }: { keys: React.ReactNode; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{desc}</span>
      <span className="flex items-center gap-1 shrink-0">{keys}</span>
    </div>
  )
}

function ShortcutGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1.5">{title}</div>
      {children}
    </div>
  )
}

const MOD = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-panel max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="text-lg font-bold">⌨️ Pintasan Keyboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Shortcut aktif hanya saat aplikasi ini dalam fokus. Di dalam kolom teks (field RPS),
            pintasan pemformatan berlaku otomatis seperti Microsoft Word.
          </p>
        </div>

        <div className="dialog-body max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <ShortcutGroup title="File / Project">
                <ShortcutRow desc="Proyek baru" keys={<><Kbd>{MOD}+N</Kbd></>} />
                <ShortcutRow desc="Buka proyek" keys={<><Kbd>{MOD}+O</Kbd></>} />
                <ShortcutRow desc="Simpan" keys={<><Kbd>{MOD}+S</Kbd></>} />
                <ShortcutRow desc="Simpan sebagai" keys={<><Kbd>{MOD}+Shift+S</Kbd></>} />
                <ShortcutRow desc="Ekspor (pilih Word/PDF)" keys={<><Kbd>{MOD}+E</Kbd></>} />
                <ShortcutRow desc="Ekspor PDF" keys={<><Kbd>{MOD}+P</Kbd></>} />
                <ShortcutRow desc="Ekspor Word" keys={<><Kbd>{MOD}+Shift+E</Kbd></>} />
                <ShortcutRow desc="Import kurikulum" keys={<><Kbd>{MOD}+Shift+I</Kbd></>} />
              </ShortcutGroup>

              <ShortcutGroup title="Undo / Redo Dokumen">
                <ShortcutRow desc="Undo (di luar kolom teks)" keys={<><Kbd>{MOD}+Z</Kbd></>} />
                <ShortcutRow desc="Redo (di luar kolom teks)" keys={<><Kbd>{MOD}+Y</Kbd> <Kbd>{MOD}+Shift+Z</Kbd></>} />
                <ShortcutRow
                  desc="Di dalam kolom teks"
                  keys={<><span className="text-xs text-gray-500">undo/redo otomatis per kolom</span></>}
                />
              </ShortcutGroup>
            </div>

            <div>
              <ShortcutGroup title="Pemformatan Teks (di dalam kolom RPS)">
                <ShortcutRow desc="Tebal / miring / garis bawah" keys={<><Kbd>{MOD}+B</Kbd> <Kbd>{MOD}+I</Kbd> <Kbd>{MOD}+U</Kbd></>} />
                <ShortcutRow desc="Coret (strikethrough)" keys={<><Kbd>{MOD}+Shift+X</Kbd></>} />
                <ShortcutRow desc="Daftar bernomor / berpoin" keys={<><Kbd>{MOD}+Shift+7</Kbd> <Kbd>{MOD}+Shift+8</Kbd></>} />
                <ShortcutRow desc="Tempel tanpa format" keys={<><Kbd>{MOD}+Shift+V</Kbd></>} />
              </ShortcutGroup>

              <ShortcutGroup title="Tampilan (Zoom)">
                <ShortcutRow desc="Perbesar" keys={<><Kbd>{MOD}+Wheel</Kbd> <Kbd>{MOD}+=</Kbd></>} />
                <ShortcutRow desc="Perkecil" keys={<><Kbd>{MOD}+-</Kbd></>} />
                <ShortcutRow desc="Reset ke 100%" keys={<><Kbd>{MOD}+0</Kbd></>} />
              </ShortcutGroup>

              <ShortcutGroup title="Lainnya">
                <ShortcutRow desc="Buka panduan section aktif" keys={<><Kbd>F1</Kbd></>} />
                <ShortcutRow desc="Tutup dialog / menu konteks" keys={<><Kbd>Esc</Kbd></>} />
              </ShortcutGroup>
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="btn btn-primary">Tutup</button>
        </div>
      </div>
    </div>
  )
}