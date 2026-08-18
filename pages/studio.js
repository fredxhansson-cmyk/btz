import Head from 'next/head';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// The DAW touches AudioContext, canvas and localStorage, so it is client only.
const Studio = dynamic(() => import('../components/studio/Studio'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#16181c', color: '#8b929c', fontFamily: 'system-ui, sans-serif',
    }}>
      Laddar FLOW Studio…
    </div>
  ),
});

export default function StudioPage() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is optional */ });
    }
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  return (
    <>
      <Head>
        <title>FLOW Studio — musikstudio i webblasaren</title>
        <meta name="description" content="En musikstudio som kors direkt i webblasaren: trummaskin, step sequencer, piano roll, playlist, mixer, automation och ett eget ljudbibliotek. Fungerar pa dator, mobil och surfplatta." />
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#16181c" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FLOW" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/icon-192.png" />
      </Head>
      <Studio
        installPrompt={installPrompt}
        onInstalled={() => setInstallPrompt(null)}
      />
    </>
  );
}
