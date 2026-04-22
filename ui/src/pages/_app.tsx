import type { AppProps } from 'next/app';
import { HardwareProvider } from '../context/HardwareContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HardwareProvider>
      <Component {...pageProps} />
    </HardwareProvider>
  );
}
