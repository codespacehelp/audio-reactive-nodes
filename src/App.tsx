export default function App() {
  return (
    <div className="flex h-screen w-screen bg-zinc-900 text-zinc-100">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-800 border-b border-zinc-700" />

      {/* Canvas area */}
      <div className="flex-1 mt-10" />

      {/* Property panel */}
      <div className="w-80 mt-10 bg-zinc-800 border-l border-zinc-700" />
    </div>
  );
}
