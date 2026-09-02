interface StartScreenProps {
  onNew: () => void
  onOpen: () => void
}

export function StartScreen({ onNew, onOpen }: StartScreenProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">RPS Maker</h1>
        <p className="text-lg text-gray-600">UNIVERSITAS IBNU SINA AJIBARANG</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onNew}
          className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left group"
        >
          <div className="text-2xl mb-2">📄</div>
          <div className="font-semibold text-gray-800 group-hover:text-blue-600">Project Baru</div>
          <div className="text-sm text-gray-500">Buat RPS dari template kosong</div>
        </button>

        <button
          onClick={onOpen}
          className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left group"
        >
          <div className="text-2xl mb-2">📂</div>
          <div className="font-semibold text-gray-800 group-hover:text-blue-600">Buka File</div>
          <div className="text-sm text-gray-500">Buka project .rps yang sudah ada</div>
        </button>
      </div>
    </div>
  )
}
