# BTZ / FLOW Studio — Vision 2100

Ett musikprogram som om det byggdes år 2100, men skeppbart i etapper med start idag.
Det här dokumentet är till för att kunna visas upp i ett samarbets- eller investeringssamtal:
vad vi bygger, varför det är annorlunda, hur det säljs och hur det skalar.

## Kärnidén i en mening

Ett rent proffsverktyg där du går från idé till mastrad release utan friktion, med en
AI-bandmedlem som lär sig din smak — helt i webbläsaren, byggt för att samarbeta i realtid.

## Paradigmskiftet: från verktyg-först till intention-först

Dagens studior tvingar dig att lära dig verktyget: spår, kanaler, plugins, fönster.
Ett 2100-program vänder på det. Du uttrycker en intention — skriver, nynnar, spelar,
pekar — och programmet förverkligar den. Tidslinjen, mixern och pianorullen finns kvar,
men som lager du kan öppna för att finjustera, inte som första hindret.

Principen: "Prompten är den nya pluginen." Kommandofältet (⌘K) är redan första steget —
en enda ruta där du hittar allt och beskriver vad du vill.

## De sju byggstenarna

1. En enda levande yta. Inga separata fönster för pianorulle, mixer och arrangemang.
   En adaptiv canvas som morfar efter vad du gör och zoomar sömlöst från låt till sektion
   till ton till enskilt sample-korn. Oändlig zoom, en yta.

2. Allt är redigerbart för alltid. Ljud och MIDI smälter ihop. Vilket ljud som helst går
   att spela om, tonhöjdsändra och byta instrument i efterhand — även en rå inspelning.
   Dra in en skiss, byt melodin, byt sångaren, byt rummet.

3. AI som bandmedlem, inte en knapp. En ihållande medskapare som lär sig din smak
   (BTZ "brain" är fröet till detta), föreslår men tar aldrig över. Spöktagningar, A/B,
   "gör den mer som X". Ju mer du använder den, desto mer låter den som du.

4. Referensdriven allt. Släpp en låt du gillar och säg "ta mig dit" — ton, energi,
   loudness, arrangemang. Mastringen matchar den. Instrumenten matchar den.

5. Beskrivna instrument, inte samplade. "En snedstämd Rhodes genom en trasig bandspelare
   i en katedral." Neurala instrument som genereras från en beskrivning, inte laddas.

6. Multiplayer som grundprimitiv. Samarbeta som i Figma/Docs fast för ljud — flera
   personer i samma projekt samtidigt, latenskompenserat jam över hela världen.

7. Osynlig, kontinuerlig mastring. Alltid release-klar, mål-medveten per plattform
   (Spotify, klubb, film). Du hör aldrig ett omastrat resultat igen.

## Funktioner man "aldrig kunnat ana" (men som är tekniskt trovärdiga)

- Semantisk tidslinje: navigera på musikalisk mening ("dropet", "andra versen",
  "där det blir sorgligt") i stället för takter.
- Stem-separation på vad som helst du drar in — dela upp valfri låt i sång/trummor/bas.
- Nynna basgången → den blir en riktig baslinje på rätt instrument, i rätt tonart.
- Stilöverföring mellan dina egna låtar.
- Rumslig/immersiv ljudbild som standard, som auto-viks till stereo vid export.
- Förklarad mastring: den visar vad den gjorde och varför, så du lär dig.
- Levande låtar: leverera inte bara en fil utan ett responsivt system som kan remixa sig
  själv efter kontext — plus en renderad standardversion.

## Designspråk

Lugnt, mörkt, rymligt, nästan utan chrome. Innehållet i centrum. Känns som ett instrument,
inte som mjukvara. Gest + röst + MIDI + traditionell inmatning, alla likvärdiga.
Tillgänglighet inbyggt från början. Öppna appen och ha ljud på fem sekunder — ingen
projektuppsättning, inget "spara" (allt versioneras automatiskt, som git, med grenar).

## Varför just detta är säljbart

Marknaden för musikskapande demokratiseras snabbt och flyttar till molnet.
Vår kil är tydlig och unik i kombination:

- Webbläsarnativ, noll installation — distribueras var som helst, funkar på allt.
- AI-native från grunden, inte AI påklistrat på en gammal DAW.
- Noll friktion — idé till mastrad release på minuter, inte veckor av inlärning.
- En personlig smakmodell som blir bättre ju mer du använder den = inbyggd
  inlåsning och en datasnurra ingen konkurrent kan kopiera i efterhand.

## Affärsmodell (flera intäktsben, lågt COGS)

- Gratis: full studio i webbläsaren, begränsad AI och export.
- Pro (prenumeration): högre kvalitet på modeller, stem-separation, obegränsad AI,
  släpp/distribution, fler exportformat.
- Team/label: fleranvändarprojekt, delade bibliotek, rättighetshantering.
- Marknadsplats: ljudpaket och neurala instrument med intäktsdelning till skapare.

## Hur det skalar tekniskt

- Klienten är webben (Next.js, redan på plats) → i princip noll distributionskostnad.
- Projektdata är liten JSON (redan så idag) → billigt att lagra och versionera.
- Tung AI körs på server/edge (t.ex. Vercel AI Gateway + GPU-inferens), inte i klienten.
- Samples i blob-lagring; realtidssamarbete via CRDT.
- Arkitekturen skiljer redan projekt (JSON) från rendering — rätt grund för allt ovan.

## Vägen dit (etapper som var och en är säljbar)

1. Friktionsfri kärna: kommandofält (⌘K), en tydlig yta, noll-setup. (Påbörjad.)
2. AI-bandmedlem v1: referensdriven generering + smakmodell som syns och lär.
3. Mastring i världsklass: kontinuerlig, mål-medveten, förklarad.
4. Live-ingångar och samarbete: mic/skivspelare som kanaler, sedan multiplayer.
5. Beskrivna instrument och stem-separation: "aldrig anat"-funktionerna.
6. Levande låtar och semantisk tidslinje: paradigmskiftet fullt ut.

Var etapp gör produkten mer säljbar och mer inlåsande än den förra.
