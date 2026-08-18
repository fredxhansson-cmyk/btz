# FLOW Studio

Musikstudio som kors direkt i webblasaren — trummaskin, piano roll, playlist,
mixer, automation, mastering, inspelning och ett eget ljudbibliotek. Fungerar
pa dator, mobil och surfplatta, och gar att installera som app.

Det har ar en **fristaende Next.js-app**. Den ligger i samma repo som
loparsko-guiden men delar ingenting med den, sa den kan peka mot en egen domän
(t.ex. `flowstudio.se`) utan att paverka sajten.

## Kora lokalt

```bash
cd flow-studio
npm install
npm run dev
```

Oppna sedan **http://localhost:3000** — studion ligger pa startsidan, ingen
sokvag efter.

Om porten ar upptagen: `npm run dev -- -p 3001` och oppna
`http://localhost:3001`.

## Bygga och kora skarpt

```bash
npm run build
npm start
```

## Publicera pa egen adress

Appen ar en vanlig Next.js-app utan backend, sa den kan ligga hos vilken
statisk/Node-host som helst.

* **Vercel**: skapa ett nytt projekt fran repot och satt *Root Directory* till
  `flow-studio`. Peka sedan din domän dit.
* **Netlify**: base directory `flow-studio`, build `npm run build`.
* **Egen server**: `npm run build && npm start` bakom en reverse proxy.

Kor den over https i skarp drift — mikrofoninspelning, installation som app och
offline-lage kraver saker kontext (localhost raknas som sakert vid utveckling).

Full funktionsbeskrivning finns i [DOCS.md](DOCS.md).
