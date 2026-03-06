import { useState, useEffect, type ReactNode } from 'react';
import ErrorScreen from './ErrorScreen';

interface WebGPUCheckProps {
  children: ReactNode;
}

export default function WebGPUCheck({ children }: WebGPUCheckProps) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported('gpu' in navigator);
  }, []);

  if (supported === null) {
    return null; // Still checking
  }

  if (!supported) {
    return (
      <ErrorScreen
        title="WebGPU Not Available"
        message="This application requires WebGPU support. Please use a recent version of Chrome or Edge with WebGPU enabled."
      />
    );
  }

  return <>{children}</>;
}
