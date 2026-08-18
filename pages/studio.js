import Head from 'next/head';
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
  return (
    <>
      <Head>
        <title>FLOW Studio — musikstudio i webblasaren</title>
        <meta name="description" content="En FL Studio-inspirerad musikstudio som kors direkt i webblasaren: step sequencer, piano roll, playlist, mixer och WAV-export." />
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Studio />
    </>
  );
}
