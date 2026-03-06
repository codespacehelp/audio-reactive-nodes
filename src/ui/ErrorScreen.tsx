interface ErrorScreenProps {
  title: string;
  message: string;
}

export default function ErrorScreen({ title, message }: ErrorScreenProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-900">
      <div className="max-w-md rounded-lg border border-red-800 bg-zinc-800 p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-red-400">{title}</h1>
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
