# Opis projekta

Fitheon je mobilna aplikacija za iPhone, ki resnične treninge spremeni v igro
gradnje fitnesa. Treningi se samodejno preberejo iz Apple Health, vsak trening
prinese **kovance** in **izkušenjske točke (XP)**, z njimi pa uporabnik
opremlja in nadgrajuje svoj virtualni fitnes.

Vir: [Fitheon-Specification-v2.md](Fitheon-Specification-v2.md), poglavja 1–5.

## 1. Problem

Redna vadba je težka predvsem zato, ker so njeni rezultati počasni in
neopazni: po posameznem treningu se na telesu ne spremeni nič vidnega.
Obstoječe aplikacije za vadbo tega ne rešijo dobro:

- **Zahtevajo dodatno delo.** Uporabnik mora treninge ročno vnašati ali
  uporabljati točno določeno aplikacijo oziroma napravo.
- **Kaznujejo izpuščene dneve.** Nizi (streaks), ki se ob izpuščenem dnevu
  izničijo, uporabnika po prvem spodrsljaju pogosto odvrnejo od aplikacije.
- **Nagrada ni oprijemljiva.** Značke in statistika ne dajo občutka, da je
  trening nekaj zgradil.

Fitheon na to odgovori tako, da je **trening sam igranje igre**. Aplikacija
je le hiter razdeljevalnik nagrad: uporabnik jo odpre po treningu, vidi, kaj
je zaslužil, to v manj kot minuti porabi in opazi, da je njegov fitnes vidno
boljši.

### Cilji

- Vsak trening nekaj omogoči: vedno obstaja naslednja stvar, ki jo je mogoče
  kupiti.
- Brez dodatnega dela za uporabnika: ročnega beleženja ni.
- Uporabno brez ure Apple Watch; zadošča katerakoli aplikacija, ki treninge
  zapisuje v Apple Health.
- Aplikacijo lahko zgradi in vzdržuje en razvijalec, na sistemu Windows, brez
  računalnika Mac.

### Česa aplikacija namenoma ne počne

- Uporabnika ne kaznuje: ni nizov, ki bi jih lahko izgubil, ni kazni in nič
  se mu nikoli ne odvzame.
- Ne zahteva dolgega zadrževanja v aplikaciji.
- Ne nagrajuje drobljenja treningov ali »praznih« vadb namesto prave vadbe.

## 2. Ciljna skupina

Fitheon je namenjen **uporabnikom iPhona, ki že trenirajo ali želijo
trenirati redno** in svoje treninge že beležijo oziroma so jih pripravljeni
beležiti z aplikacijo ali napravo, ki piše v Apple Health.

| Skupina | Kaj potrebuje | Kako jo Fitheon nagovori |
|---|---|---|
| Rekreativci v fitnesu (trening moči nekajkrat na teden, aplikacije Strong, Hevy ipd.) | Dodatno motivacijo za rednost | Tedenski cilj aktivnih dni, XP in ravni nagrajujejo rednost |
| Tekači, kolesarji in drugi športniki (Strava, Apple Watch) | Nagrado za opravljen obseg vadbe | Kovanci so odvisni od trajanja, vrste in intenzivnosti treninga |
| Začetniki, ki težko vztrajajo | Hiter občutek napredka brez občutka krivde | Že prvi trening prinese novo raven; izpuščen teden nima posledic |
| Uporabniki brez ure Apple Watch | Rešitev, ki ne zahteva dodatne opreme | Vodnik za nastavitev pokaže, kako vklopiti zapisovanje v Apple Health |

Tipičen uporabnik opravi tri približno 50-minutne treninge moči na teden in s
tem zasluži okoli 375 kovancev in 110 XP tedensko.

## 3. Osnovna zanka

```
Trening (katerakoli aplikacija ali naprava, ki piše v Apple Health)
  -> Fitheon sinhronizira nove treninge (v ozadju ali ob odprtju)
  -> strežnik izračuna kovance in XP
  -> obvestilo oziroma povzetek ob vrnitvi
  -> poraba kovancev: zapolnitev mesta, nadgradnja naprave, nov videz fitnesa
  -> nova raven: odklenejo se nove naprave in kakovostne stopnje
  -> dosežena zahtevana raven + plačilo kovancev: selitev v naslednji fitnes
```

## 4. Glavne funkcionalnosti

### 4.1 Samodejni uvoz treningov

Treningi se preberejo iz Apple Health, brez ročnega vnosa. Ob prvi namestitvi
se uvozijo in normalno nagradijo treningi zadnjih 7 dni. Če prvi uvoz ne najde
nobenega treninga, aplikacija prikaže vodnik za nastavitev zapisovanja v Apple
Health v aplikacijah Strong, Hevy, Strava in podobnih.

### 4.2 Pravila za upoštevanje treningov

Nagrade so omejene, da se splača le prava vadba:

- trening mora trajati vsaj 10 minut;
- na dan se upošteva največ 120 minut, sešteto čez vse treninge;
- ročno vneseni treningi se zavrnejo;
- trening, ki se z že upoštevanim prekriva za več kot polovico krajšega, ne
  prinese ničesar;
- nagrade so dokončne: pozno prispel ali izbrisan trening jih nikoli ne
  odvzame.

### 4.3 Kovanci

Kovanci nagrajujejo **obseg** vadbe:

```
kovanci = upoštevane minute × množitelj × 2
množitelj = večja od vrednosti: osnova vrste vadbe ali razred intenzivnosti
```

- Osnova vrste vadbe je od 0,75 (hoja, joga, pilates) prek 1,0 (kolesarjenje,
  pohodništvo, športi) do 1,25 (trening moči, HIIT, tek, veslanje, plavanje).
- Razred intenzivnosti (od 0,75 do 1,5) se uporabi le, kadar trening vsebuje
  podatek o MET. Intenzivnost lahko nagrado samo poveča, nikoli zmanjša;
  uporabniki brez merilnika srčnega utripa dobijo osnovo vrste vadbe.

### 4.4 XP, tedenski cilj in ravni

XP nagrajuje **rednost**:

- prvi upoštevani trening v dnevu prinese +20 XP;
- dosežen tedenski cilj prinese +50 XP, enkrat na teden, takoj ob dosegu.

Tedenski cilj je število aktivnih dni na teden (1–7, privzeto 3), ki ga
uporabnik izbere ob prvem zagonu; sprememba velja od naslednjega ponedeljka.
XP se nikoli ne porabi in ne izgubi. Zbrani XP dviguje **raven** igralca, ta
pa odklepa naprave, kakovostne stopnje in naslednje fitnese. Prvi trening
vedno prinese novo raven.

### 4.5 Fitnesi

Igralec napreduje skozi zaporedje ločenih, vedno večjih fitnesov. Za selitev
sta potrebna določena raven in plačilo v kovancih; trenutnega fitnesa ni treba
dokončati. Prejšnji fitnesi ostanejo nespremenjeni, obiskljivi in jih je
mogoče še naprej urejati.

| # | Fitnes | Zahtevana raven | Cena selitve | Najvišja kakovost | Mest |
|---|---|---|---|---|---|
| 1 | Garaža | 1 | brezplačno | Osnovna | 5 |
| 2 | Sosedski fitnes | 6 | 500 | Standardna | 9 |
| 3 | Komercialni fitnes | 16 | 2.000 | Komercialna | 15 |
| 4 | Elitni klub | 30 | 5.000 | Elitna | 22 |

Igralec začne v Garaži s privzetimi tlemi in stenami ter brezplačnim stojalom
za ročke.

### 4.6 Mesta in naprave

Vsak fitnes ima **vnaprej določena mesta**, razdeljena po kategorijah (proste
uteži, klop, potisk, stojalo, vlek, kardio, naprava, dekoracija). Razpored je
stalen; igralec za vsako mesto izbere, katera naprava bo tam stala. Z mestom
so mogoča štiri dejanja:

- **Izbira:** prazno mesto ponudi odklenjene naprave, ki jih sprejme; nakup
  napravo postavi.
- **Prenos:** v novem fitnesu je mogoče napravo iz prejšnjega brezplačno
  prenesti kot kopijo, z ohranjeno kakovostjo.
- **Nadgradnja:** s kovanci se naprava dvigne za eno kakovostno stopnjo.
- **Menjava:** zamenjana naprava se ne izgubi; shrani se za to mesto in
  vrnitev nanjo je brezplačna.

Na voljo je 15 linij naprav (npr. klop, bench press, sobno kolo, počepno
stojalo, tekalna steza, veslaški trenažer, kabelska naprava) in dekoracije
(rastlina, televizor, kavč, omarice, recepcija).

### 4.7 Kakovostne stopnje

Naprave se nadgrajujejo skozi štiri stopnje: Osnovna, Standardna, Komercialna
in Elitna (cena koraka 100, 300, 800 in 1.500 kovancev, pomnoženo z velikostnim
razredom naprave). Stopnja je na voljo, ko jo dovoljujeta tako fitnes kot raven
igralca. Stopnje se morajo na zaslonu telefona jasno razlikovati; višja stopnja
lahko spremeni tudi model naprave (drog za zgibe postane naprava za vlek na
prsi).

### 4.8 Videz fitnesa

Vsak fitnes ima po tri sloge tal in sten. Eden je privzet, druga dva se kupita
s kovanci; med kupljenimi slogi se prosto preklaplja.

### 4.9 Zasloni

| Zaslon | Vsebina |
|---|---|
| Uvod | Pozdrav, dovoljenje za Apple Health, izbira tedenskega cilja, povzetek 7-dnevnega uvoza |
| Vodnik za nastavitev | Navodila za vklop zapisovanja v Apple Health, kadar uvoz ne najde treningov |
| Fitnes (domači zaslon) | Trenutni fitnes kot izometrična slika; kovanci, raven in XP, napredek tedenskega cilja; označena prazna mesta; gumb za selitev, ko so pogoji izpolnjeni |
| List mesta | Izbira, prenos, nadgradnja in menjava naprave; zaklenjene možnosti kažejo zahtevano raven |
| List sloga | Slogi tal in sten trenutnega fitnesa |
| Fitnesi | Vsi fitnesi v lasti in naslednji s svojimi zahtevami |
| Povzetek ob vrnitvi | Novi treningi, kovanci, XP, nove ravni in odklenjene vsebine |
| Aktivnost | Sinhronizirani treningi s trajanjem, množiteljem, kovanci in XP; neupoštevani so sivi, z razlogom |
| Nastavitve | Tedenski cilj, takojšnja sinhronizacija, račun, izbris računa |

Aplikacija nima načina urejanja, inventarja in ločene trgovine.

## 5. Izven obsega

V prvi različici **ne bo**:

- družabnih funkcij, lestvic in prijateljev;
- različice za Android;
- premium valute in kakršnegakoli monetiziranja;
- proste gradnje fitnesa (mreža, vlečenje in spuščanje) — ta zasnova je bila
  namenoma opuščena v korist vnaprej določenih mest;
- močne zaščite pred goljufanjem — nagrade so omejene, ne pa preverjene;
- nagrad, odvisnih od vaj, serij, ponovitev ali teže — Apple Health vsebuje le
  povzetek treninga;
- prodaje naprav.

Ideje za pozneje (obiskovanje fitnesov prijateljev, dodatni fitnesi in
naprave, vgrajen merilnik treninga, Android) so zbrane v 12. poglavju
specifikacije.
