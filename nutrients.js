/* =============================================================
   nutrients.js — Ravintoaineiden kuvaukset, terveyshyödyt,
   päivittäiset suositukset ja esimerkkilähteet
   Lähde: VRN, EFSA, WHO
   ============================================================= */

const NUTRIENT_INFO = {

  energia: {
    nimi: 'Energia',
    yksikko: 'kcal',
    vari: '#c8522a',
    kuvaus: 'Energia kuvaa ruoan sisältämää polttoainetta, jonka elimistö käyttää kaikkeen toimintaansa — hengittämisestä liikkeeseen ja ajatteluun. Energiaa saadaan hiilihydraateista (4 kcal/g), proteiineista (4 kcal/g) ja rasvoista (9 kcal/g).',
    hyodyt: [
      'Ylläpitää perusaineenvaihduntaa — sydämen, aivojen ja elinten toimintaa levossa.',
      'Antaa polttoaineen fyysiselle aktiivisuudelle ja urheilusuorituksille.',
      'Tukee kasvua, solujen uusiutumista ja hormonituotantoa.',
      'Tasapainoinen energiansaanti ehkäisee väsymystä ja ylläpitää kehon koostumusta.',
    ],
    suositukset: [
      { ryhma: 'Aikuiset naiset (vähän liikkuvat)', arvo: '1800–2000 kcal/vrk' },
      { ryhma: 'Aikuiset miehet (vähän liikkuvat)', arvo: '2200–2500 kcal/vrk' },
      { ryhma: 'Aktiivisesti liikkuvat', arvo: '2500–3500+ kcal/vrk' },
      { ryhma: 'Lapset 7–12 v', arvo: '1600–2200 kcal/vrk' },
    ],
    huom: 'Yksilöllinen tarve riippuu iästä, sukupuolesta, kehon koosta ja aktiivisuustasosta.',
    ruokaesimerkit: [
      { nimi: 'Avokado', arvo: '160 kcal / 100 g' },
      { nimi: 'Kananmuna (L)', arvo: '~70 kcal / kpl' },
      { nimi: 'Täysjyväleipä', arvo: '~230 kcal / 100 g' },
      { nimi: 'Parsakaali', arvo: '34 kcal / 100 g' },
      { nimi: 'Rypsiöljy', arvo: '900 kcal / 100 g' },
    ],
  },

  proteiini: {
    nimi: 'Proteiini',
    yksikko: 'g',
    vari: '#3a7d5f',
    kuvaus: 'Proteiinit ovat aminohapoista koostuvia makromolekyylejä — elimistön rakennusaineita. Niistä koostuvat lihakset, entsyymit, hormonit ja vasta-aineet. Välttämättömiä aminohappoja on 9, joita elimistö ei osaa itse valmistaa.',
    hyodyt: [
      'Rakentaa ja korjaa lihas- ja sidekudosta — erityisen tärkeää urheilussa.',
      'Pitää kylläisenä pitkään: proteiini hillitsee nälkää tehokkaammin kuin hiilihydraatit.',
      'Tukee immuunijärjestelmää — vasta-aineet ovat proteiineja.',
      'Osallistuu entsyymien ja hormonien (mm. insuliini) tuotantoon.',
      'Auttaa ylläpitämään lihasmassaa ikääntyessä.',
    ],
    suositukset: [
      { ryhma: 'Perusterve aikuinen', arvo: '0,8 g / kg / vrk' },
      { ryhma: 'Aktiivisesti liikkuva', arvo: '1,4–2,0 g / kg / vrk' },
      { ryhma: 'Lihaskasvu / voimaharjoittelu', arvo: '1,6–2,2 g / kg / vrk' },
      { ryhma: '70 kg aikuinen (perus)', arvo: '~56 g/vrk' },
    ],
    huom: 'Hyvät lähteet: liha, kala, kananmuna, maitotuotteet, palkokasvit, tofu ja pähkinät.',
    ruokaesimerkit: [
      { nimi: 'Kananrinta', arvo: '31 g / 100 g' },
      { nimi: 'Tonnikala (purkki)', arvo: '26 g / 100 g' },
      { nimi: 'Kananmuna', arvo: '13 g / 100 g' },
      { nimi: 'Linssit (keitetty)', arvo: '9 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '2,8 g / 100 g' },
    ],
  },

  hiilihydraatti: {
    nimi: 'Hiilihydraatit',
    yksikko: 'g',
    vari: '#b45309',
    kuvaus: 'Hiilihydraatit ovat elimistön ensisijainen energianlähde. Ne koostuvat sokereista, tärkkelyksestä ja kuidusta. Aivot kuluttavat n. 120 g glukoosia päivässä — hiilihydraatit ovat niiden tärkein polttoaine.',
    hyodyt: [
      'Nopea energianlähde lihaksille ja aivoille.',
      'Säästää proteiinia rakennusaineiksi, kun energiansaanti on riittävä.',
      'Kuidukkaat hiilihydraatit tukevat suoliston terveyttä.',
      'Tukee mielialaa: insuliini auttaa tryptofaania pääsemään aivoihin → serotoniinia.',
      'Urheilussa tärkein pitkäkestoisen suorituksen polttoaine.',
    ],
    suositukset: [
      { ryhma: 'Suositeltu osuus energiasta', arvo: '45–60 %' },
      { ryhma: '2000 kcal ruokavalio', arvo: '225–300 g/vrk' },
      { ryhma: 'Kestävyysurheilija', arvo: '5–10 g / kg / vrk' },
      { ryhma: 'Lisättyä sokeria enintään', arvo: '< 50 g/vrk (10 % energiasta)' },
    ],
    huom: 'Suosi täysjyväviljoja, juureksia ja hedelmiä. Rajoita lisättyä sokeria ja valkoisia viljoja.',
    ruokaesimerkit: [
      { nimi: 'Kaurahiutaleet', arvo: '60 g / 100 g' },
      { nimi: 'Banaani', arvo: '23 g / 100 g' },
      { nimi: 'Täysjyväriisi (keitetty)', arvo: '23 g / 100 g' },
      { nimi: 'Bataatti (keitetty)', arvo: '20 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '7 g / 100 g' },
    ],
  },

  rasva: {
    nimi: 'Rasva',
    yksikko: 'g',
    vari: '#c8522a',
    kuvaus: 'Rasvat ovat välttämättömiä ravintoaineita rasvaliukoisten vitamiinien (A, D, E, K) imeytymiseen, hormonituotantoon ja solukalvojen rakentamiseen. Rasvojen laatu on määrää tärkeämpää.',
    hyodyt: [
      'Vitamiinit A, D, E ja K tarvitsevat rasvaa imeytyäkseen.',
      'Omega-3-rasvahapot tukevat sydämen terveyttä ja vähentävät tulehdusta.',
      'Aivoista n. 60 % on rasvaa — DHA on kriittinen aivojen toiminnalle.',
      'Hormonituotanto vaatii kolesterolia.',
      'Pitää kylläisenä: rasva hidastaa mahalaukun tyhjenemistä.',
    ],
    suositukset: [
      { ryhma: 'Suositeltu osuus energiasta', arvo: '25–40 %' },
      { ryhma: '2000 kcal ruokavalio', arvo: '55–90 g/vrk' },
      { ryhma: 'Tyydyttynyttä enintään', arvo: '< 22 g/vrk (10 % energiasta)' },
      { ryhma: 'Transrasvaa enintään', arvo: '< 2 g/vrk' },
    ],
    huom: 'Suosi oliiviöljyä, avokadoa, pähkinöitä ja rasvaista kalaa. Vältä transrasvoja.',
    ruokaesimerkit: [
      { nimi: 'Oliiviöljy', arvo: '100 g / 100 g' },
      { nimi: 'Avokado', arvo: '15 g / 100 g' },
      { nimi: 'Lohi', arvo: '13 g / 100 g' },
      { nimi: 'Mantelit', arvo: '50 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '0,4 g / 100 g' },
    ],
  },

  tyydyttynyt: {
    nimi: 'Tyydyttynyt rasva',
    yksikko: 'g',
    vari: '#9b3522',
    kuvaus: 'Tyydyttyneet rasvahapot ovat rasvoja, joiden hiiliketjuissa ei ole kaksoissidoksia. Ne ovat kiinteitä huoneenlämmössä. Liikaa nautittuna ne voivat nostaa LDL-kolesterolia ja lisätä sydän- ja verisuonitautien riskiä.',
    hyodyt: [
      'Kohtuullinen määrä on osa normaalia ruokavaliota.',
      'Jotkut tyydyttyneet rasvat (MCT) voivat tukea energiatasoa.',
      'Esiintyy luonnollisesti maitotuotteissa, joissa on muitakin ravintoaineita.',
    ],
    suositukset: [
      { ryhma: 'WHO-suositus', arvo: '< 10 % kokonaisenergiasta' },
      { ryhma: '2000 kcal ruokavalio', arvo: '< 22 g/vrk' },
      { ryhma: 'Sydänriskiryhmä (AHA)', arvo: '< 13 g/vrk' },
    ],
    huom: 'Suurimmat lähteet: voi, rasvaiset maitotuotteet, punainen liha, kookostuotteet.',
    ruokaesimerkit: [
      { nimi: 'Voi', arvo: '51 g / 100 g' },
      { nimi: 'Cheddar-juusto', arvo: '21 g / 100 g' },
      { nimi: 'Kookosöljy', arvo: '86 g / 100 g' },
      { nimi: 'Sika (rasvainen)', arvo: '14 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '0,1 g / 100 g' },
    ],
  },

  kuitu: {
    nimi: 'Kuitu',
    yksikko: 'g',
    vari: '#3a7d5f',
    kuvaus: 'Ravintokuitu on hiilihydraatti, jota elimistö ei pysty itse pilkkomaan. Se toimii suoliston mikrobiston ravintona. Liukoinen kuitu hidastaa sokerin imeytymistä, liukenematon lisää ulosteen massaa.',
    hyodyt: [
      'Parantaa suoliston terveyttä ja säännöllisyyttä.',
      'Ruokkii hyödyllisiä suolistobakteereja.',
      'Liukoinen kuitu laskee LDL-kolesterolia ja tasaa verensokeria.',
      'Lisää kylläisyyttä — auttaa painonhallinnassa.',
      'Vähentää paksusuolen syövän, diabeteksen ja sydäntautien riskiä.',
    ],
    suositukset: [
      { ryhma: 'Naiset (VRN)', arvo: '25 g/vrk' },
      { ryhma: 'Miehet (VRN)', arvo: '35 g/vrk' },
      { ryhma: 'Lapset 4–8 v', arvo: '15–20 g/vrk' },
    ],
    huom: 'Lisää kuitua asteittain runsaan nesteen kanssa. Äkillinen lisäys voi aiheuttaa turvotusta.',
    ruokaesimerkit: [
      { nimi: 'Pellavansiemen', arvo: '27 g / 100 g' },
      { nimi: 'Mustaherukka', arvo: '7,7 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '2,6 g / 100 g' },
      { nimi: 'Kaurahiutaleet', arvo: '10 g / 100 g' },
      { nimi: 'Linssit (keitetty)', arvo: '7,9 g / 100 g' },
    ],
  },

  sokeri: {
    nimi: 'Sokeri',
    yksikko: 'g',
    vari: '#b45309',
    kuvaus: 'Sokeri viittaa yksinkertaisiin hiilihydraatteihin — sekä luontaisiin sokereihin (hedelmät, maito) että lisättyihin sokereihin. Lisätyt sokerit nostavat energiasisältöä ilman muita ravintoaineita.',
    hyodyt: [
      'Nopea energianlähde — hyödyllinen ennen urheilusuoritusta.',
      'Luontaiset sokerit hedelmissä tulevat kuidun ja vitamiinien kanssa.',
      'Glukoosi on aivojen tärkein polttoaine akuuteissa tilanteissa.',
    ],
    suositukset: [
      { ryhma: 'WHO (lisätty sokeri)', arvo: '< 50 g/vrk (10 % energiasta)' },
      { ryhma: 'Tiukempi WHO-tavoite', arvo: '< 25 g/vrk (5 % energiasta)' },
      { ryhma: 'Lapset', arvo: '< 25 g/vrk lisättyä sokeria' },
    ],
    huom: 'Tämä arvo sisältää sekä luontaiset että lisätyt sokerit. Seuraa erityisesti lisättyä sokeria.',
    ruokaesimerkit: [
      { nimi: 'Medjool-taateli', arvo: '66 g / 100 g' },
      { nimi: 'Banaani', arvo: '12 g / 100 g' },
      { nimi: 'Appelsiini', arvo: '9 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '1,7 g / 100 g' },
      { nimi: 'Cola (330 ml)', arvo: '~35 g / tlk' },
    ],
  },

  suola: {
    nimi: 'Suola (NaCl)',
    yksikko: 'g',
    vari: '#6366f1',
    kuvaus: 'Suola sisältää natriumia, joka säätelee nestetasapainoa, verenpainetta ja hermoimpulsseja. Liiallinen saanti nostaa verenpainetta ja lisää sydän- ja munuaissairauksien riskiä.',
    hyodyt: [
      'Natrium säätelee nestetasapainoa ja solujen toimintaa.',
      'Välttämätön hermoimpulssien ja lihassupistusten toiminnalle.',
      'Urheilussa hikoileminen poistaa natriumia — korvaus tärkeää pitkissä suorituksissa.',
    ],
    suositukset: [
      { ryhma: 'WHO (aikuiset)', arvo: '< 5 g/vrk' },
      { ryhma: 'Suomalainen suositus (VRN)', arvo: 'Naiset < 5 g, miehet < 6 g/vrk' },
      { ryhma: 'Sydän- tai verenpainepotilas', arvo: '< 3–4 g/vrk' },
    ],
    huom: 'Suurimmat lähteet: leipä, valmisruoat, leikkeleet. Taulukoissa usein natriumina: suola = Na × 2,5.',
    ruokaesimerkit: [
      { nimi: 'Ruisleipä', arvo: '~1 g / 100 g' },
      { nimi: 'Kinkku (leikkele)', arvo: '~2,2 g / 100 g' },
      { nimi: 'Juusto (Edam)', arvo: '~1,8 g / 100 g' },
      { nimi: 'Parsakaali', arvo: '0,1 g / 100 g' },
      { nimi: 'Soijakastike', arvo: '~15 g / 100 g' },
    ],
  },

};
