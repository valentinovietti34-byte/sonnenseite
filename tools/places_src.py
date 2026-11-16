"""Curated destinations for Sonnenseite.

Each entry: P(name, kind, canton, region, ele, lat, lon, access, **extra)
  kind:   peak  = summit or high station reached by lift / mountain railway
          hill  = pre-alpine viewpoint reached by car or a short walk
          village = mountain village or resort
          pass  = road pass
          town  = lowland or valley town (usually the place you are escaping from)
  access: ("car",) | ("train",) | ("cable", valley_stop, minutes) | ("funi", ...) | ("cog", ...) | ("walk", start, minutes)
          cable = aerial cable car / gondola / chairlift, funi = funicular, cog = mountain railway
  extra:  season="summer"  -> lift or road normally closed in winter
          nav=(lat, lon)   -> explicit car destination when the valley stop cannot be geocoded
          q="..."          -> name to use when geocoding differs from display name
          tip="..."        -> one-line local knowledge

Coordinates here are first estimates; tools/build_places.py verifies them against swisstopo names,
the elevation model and the public-transport stop register, and writes data/places.js.
"""

PLACES = []


def P(name, kind, canton, region, ele, lat, lon, access=("car",), **extra):
    PLACES.append(dict(name=name, kind=kind, canton=canton, region=region, ele=ele, lat=lat, lon=lon, access=access, **extra))


# ---------------------------------------------------------------- Zürich, Zürichsee, Oberland
R = "Zürich & Oberland"
P("Zürich", "town", "ZH", R, 408, 47.3769, 8.5417, ("train",))
P("Winterthur", "town", "ZH", R, 439, 47.4990, 8.7240, ("train",))
P("Rapperswil", "town", "SG", R, 409, 47.2267, 8.8184, ("train",))
P("Wädenswil", "town", "ZH", R, 408, 47.2300, 8.6720, ("train",))
P("Uetliberg", "hill", "ZH", R, 870, 47.3496, 8.4912, ("walk", "Ringlikon", 30), q="Uto Kulm",
  tip="Zürich's own fog escape. Car-free: S10 from Zürich HB to Uetliberg, then 10 minutes on foot.")
P("Felsenegg", "hill", "ZH", R, 804, 47.3102, 8.5075, ("cable", "Adliswil, Luftseilbahn", 5),
  tip="Cable car from Adliswil; ridge walk to Uetliberg in about 1.5 hours.")
P("Albis Hochwacht", "hill", "ZH", R, 878, 47.2710, 8.5270, ("walk", "Langnau am Albis, Albispass", 20), q="Hochwacht Albis",
  tip="Lookout tower above the Albis pass.")
P("Pfannenstiel", "hill", "ZH", R, 853, 47.2867, 8.6693, ("walk", "Meilen, Vorderer Pfannenstiel", 15),
  tip="Lookout tower above the right shore of Lake Zürich.")
P("Lägern Hochwacht", "hill", "ZH", R, 853, 47.4820, 8.3940, ("walk", "Regensberg, Dorf", 45), q="Hochwacht Lägern")
P("Bachtel", "hill", "ZH", R, 1115, 47.2944, 8.8859, ("walk", "Wernetshausen", 45), nav=(47.2990, 8.8790),
  tip="Park at Orn and walk 25 minutes to the tower and restaurant.")
P("Alp Scheidegg", "hill", "ZH", R, 1197, 47.2925, 8.9535, ("car",), q="Scheidegg Wald ZH",
  tip="Mountain restaurant above Wald with a view over the fog to the Alps.")
P("Hörnli", "hill", "ZH", R, 1133, 47.3709, 8.9415, ("walk", "Steg im Tösstal", 75), tip="Hike from Steg; mountain inn on top.")
P("Hulftegg", "pass", "SG", R, 954, 47.3683, 8.9710, ("car",))
P("Sternenberg", "village", "ZH", R, 870, 47.3857, 8.9122, ("car",), tip="Highest village in canton Zürich.")
P("Atzmännig", "hill", "SG", R, 1190, 47.2700, 9.0000, ("cable", "Atzmännig, Schutt", 10), q="Atzmännig",
  tip="Chairlift from Goldingen; winter operation depends on snow.")

# ---------------------------------------------------------------- Zug, Schwyz, Einsiedeln
R = "Zug & Schwyz"
P("Zug", "town", "ZG", R, 425, 47.1662, 8.5155, ("train",))
P("Zugerberg", "hill", "ZG", R, 925, 47.1395, 8.5362, ("funi", "Zug, Schönegg", 6), tip="Funicular from Schönegg (bus 11 from Zug station).")
P("Gottschalkenberg", "hill", "ZG", R, 1164, 47.1528, 8.6725, ("car",))
P("Raten", "pass", "ZG", R, 1077, 47.1420, 8.6560, ("car",), q="Raten Oberägeri")
P("Etzel Kulm", "hill", "SZ", R, 1098, 47.1806, 8.7744, ("walk", "St. Meinrad", 30), nav=(47.1740, 8.7710), q="Etzel",
  tip="Half an hour on foot from the St. Meinrad pass; view of Lake Zürich and the Alps.")
P("Einsiedeln", "town", "SZ", R, 882, 47.1275, 8.7430, ("train",), tip="Monastery town; often right at the upper edge of the fog.")
P("Rothenthurm", "village", "SZ", R, 923, 47.1040, 8.6760, ("train",))
P("Sattelegg", "pass", "SZ", R, 1190, 47.1245, 8.8545, ("car",))
P("Mostelberg", "hill", "SZ", R, 1191, 47.0673, 8.6497, ("cable", "Sattel, Gondelbahn", 8), q="Mostelberg",
  tip="Sattel-Hochstuckli: revolving gondola from Sattel, suspension bridge and easy winter walks.")
P("Holzegg", "hill", "SZ", R, 1405, 47.0288, 8.6880, ("cable", "Brunni SZ (Talstation Holzegg)", 5), tip="Small cable car from Brunni, under the Grosser Mythen.")
P("Rotenflue", "peak", "SZ", R, 1571, 47.0210, 8.7030, ("cable", "Rickenbach SZ, Rotenfluebahn", 10), tip="Gondola from Rickenbach above Schwyz.")
P("Ibergeregg", "pass", "SZ", R, 1406, 47.0170, 8.7290, ("car",))
P("Oberiberg", "village", "SZ", R, 1087, 47.0385, 8.7795, ("car",))
P("Hoch-Ybrig", "peak", "SZ", R, 1465, 47.0190, 8.7950, ("cable", "Weglosen", 6), q="Seebli",
  tip="Cable car from Weglosen to Seebli.")
P("Stoos", "village", "SZ", R, 1300, 46.9765, 8.6635, ("funi", "Schwyz, Stoosbahn", 7), tip="Car-free; the world's steepest funicular starts at Schlattli.")
P("Fronalpstock", "peak", "SZ", R, 1921, 46.9690, 8.6375, ("funi", "Schwyz, Stoosbahn", 40), tip="Funicular to Stoos, then chairlifts. Famous view down to Lake Lucerne.")
P("Klingenstock", "peak", "SZ", R, 1935, 46.9571, 8.6759, ("funi", "Schwyz, Stoosbahn", 40))
P("Schwyz", "town", "SZ", R, 516, 47.0207, 8.6541, ("train",))

# ---------------------------------------------------------------- Rigi
R = "Rigi"
P("Rigi Kulm", "peak", "SZ", R, 1798, 47.0567, 8.4853, ("cog", "Arth-Goldau", 40), tip="Cog railway from Arth-Goldau or Vitznau. The classic sea-of-fog summit.")
P("Rigi Kaltbad", "village", "LU", R, 1433, 47.0440, 8.4655, ("cable", "Weggis, Luftseilbahn", 10), tip="Cable car from Weggis; mineral bath with a view.")
P("Rigi Scheidegg", "peak", "SZ", R, 1656, 47.0275, 8.5210, ("cable", "Kräbel", 8), tip="Cable car from Kräbel on the Arth-Goldau line.")
P("Seebodenalp", "hill", "SZ", R, 1030, 47.0598, 8.4510, ("cable", "Küssnacht am Rigi, Seebodenalpbahn", 7))

# ---------------------------------------------------------------- Glarus, Walensee
R = "Glarus & Walensee"
P("Glarus", "town", "GL", R, 472, 47.0400, 9.0680, ("train",))
P("Amden", "village", "SG", R, 911, 47.1490, 9.1420, ("car",), tip="Sun terrace above the Walensee.")
P("Arvenbüel", "village", "SG", R, 1273, 47.1650, 9.1830, ("car",))
P("Flumserberg", "village", "SG", R, 1391, 47.0925, 9.2840, ("car",), q="Tannenboden", tip="Tannenboden; also reached by gondola from Unterterzen.")
P("Maschgenkamm", "peak", "SG", R, 2019, 47.0700, 9.2700, ("cable", "Flumserberg, Tannenboden", 15))
P("Braunwald", "village", "GL", R, 1256, 46.9395, 8.9990, ("funi", "Linthal Braunwaldbahn", 7), tip="Car-free sun terrace; funicular from Linthal.")
P("Weissenberge", "hill", "GL", R, 1266, 46.9650, 9.1880, ("cable", "Matt, Station", 6), tip="Small cable car from Matt to a sunny terrace in the Sernftal.")
P("Elm", "village", "GL", R, 977, 46.9190, 9.1735, ("car",))

# ---------------------------------------------------------------- Luzern, Ob- and Nidwalden, Entlebuch, Emmental
R = "Central Switzerland"
P("Luzern", "town", "LU", R, 436, 47.0502, 8.3093, ("train",))
P("Horben", "hill", "AG", R, 818, 47.2340, 8.3215, ("car",), q="Horben Beinwil", tip="Viewpoint on the Lindenberg; clears when the fog top is low.")
P("Pilatus Kulm", "peak", "OW", R, 2073, 46.9792, 8.2562, ("cable", "Kriens, Linde-Pilatus", 40), tip="Gondola and cable car from Kriens all year; cog railway from Alpnachstad in summer.")
P("Fräkmüntegg", "peak", "NW", R, 1416, 46.9965, 8.2610, ("cable", "Kriens, Linde-Pilatus", 25))
P("Bürgenstock", "hill", "NW", R, 874, 46.9965, 8.3790, ("car",))
P("Stanserhorn", "peak", "NW", R, 1898, 46.9295, 8.3405, ("funi", "Stans, Bahnhof", 25), season="summer")
P("Klewenalp", "peak", "NW", R, 1593, 46.9400, 8.4760, ("cable", "Beckenried, Klewenalpbahn", 10))
P("Engelberg", "village", "OW", R, 1013, 46.8210, 8.4020, ("train",))
P("Brunni", "peak", "OW", R, 1606, 46.8365, 8.4075, ("cable", "Engelberg, Brunnibahn", 5), q="Ristis", tip="Ristis, on Engelberg's sunny side.")
P("Trübsee", "peak", "NW", R, 1796, 46.7935, 8.3950, ("cable", "Engelberg, Titlisbahnen", 12))
P("Titlis", "peak", "OW", R, 3020, 46.7705, 8.4255, ("cable", "Engelberg, Titlisbahnen", 35), q="Klein Titlis")
P("Melchsee-Frutt", "village", "OW", R, 1920, 46.7745, 8.2700, ("cable", "Stöckalp", 15), tip="Gondola from Stöckalp; the road is closed in winter.")
P("Langis", "pass", "OW", R, 1442, 46.8870, 8.1290, ("car",), q="Langis Glaubenberg", tip="High moor on the Glaubenberg road; kept open from Sarnen in winter.")
P("Sörenberg", "village", "LU", R, 1166, 46.8225, 8.0340, ("car",))
P("Brienzer Rothorn", "peak", "LU", R, 2350, 46.7870, 8.0465, ("cable", "Sörenberg, Schönenboden", 10), tip="Cable car from Sörenberg; steam cog railway from Brienz in summer only.")
P("Marbachegg", "peak", "LU", R, 1483, 46.8380, 7.9040, ("cable", "Marbach LU, Dorf", 10))
P("Napf", "hill", "BE", R, 1408, 47.0040, 7.9400, ("walk", "Mettlenalp", 60), nav=(46.9900, 7.9390), tip="Hike of about an hour from Mettlenalp.")
P("Lüderenalp", "hill", "BE", R, 1144, 46.9990, 7.8310, ("car",))
P("Langnau im Emmental", "town", "BE", R, 673, 46.9400, 7.7870, ("train",))
P("Menzberg", "village", "LU", R, 1016, 47.0400, 7.9990, ("car",))

# ---------------------------------------------------------------- Uri
R = "Uri & Gotthard"
P("Altdorf", "town", "UR", R, 458, 46.8804, 8.6444, ("train",))
P("Eggberge", "hill", "UR", R, 1440, 46.9000, 8.6700, ("cable", "Flüelen, Eggberge", 7), tip="Cable car from Flüelen to a terrace above Lake Uri.")
P("Andermatt", "village", "UR", R, 1437, 46.6360, 8.5940, ("train",))
P("Nätschen", "peak", "UR", R, 1842, 46.6480, 8.6090, ("cog", "Andermatt", 10))
P("Gemsstock", "peak", "UR", R, 2961, 46.6020, 8.6110, ("cable", "Andermatt, Gemsstockbahn", 20))
P("Oberalppass", "pass", "UR", R, 2044, 46.6590, 8.6710, ("cog", "Andermatt", 20), tip="The road is closed in winter; the train from Andermatt runs all year.")
P("Sedrun", "village", "GR", R, 1404, 46.6800, 8.7730, ("train",))
P("Disentis", "village", "GR", R, 1130, 46.7040, 8.8530, ("train",))

# ---------------------------------------------------------------- St. Gallen, Appenzell, Toggenburg, Rhine valley
R = "Eastern Switzerland"
P("St. Gallen", "town", "SG", R, 675, 47.4239, 9.3748, ("train",))
P("Appenzell", "town", "AI", R, 780, 47.3310, 9.4090, ("train",))
P("Säntis", "peak", "AR", R, 2502, 47.2494, 9.3433, ("cable", "Schwägalp, Säntis-Schwebebahn", 10), tip="Cable car from Schwägalp; view over six countries.")
P("Schwägalp", "pass", "AR", R, 1352, 47.2565, 9.3185, ("car",))
P("Kronberg", "peak", "AI", R, 1663, 47.2920, 9.3280, ("cable", "Jakobsbad", 8))
P("Ebenalp", "peak", "AI", R, 1640, 47.2840, 9.4130, ("cable", "Wasserauen", 6))
P("Hoher Kasten", "peak", "AI", R, 1794, 47.2839, 9.4857, ("cable", "Brülisau, Kastenbahn", 8), tip="Revolving restaurant above the Rhine valley.")
P("St. Anton", "hill", "AI", R, 1110, 47.4100, 9.5580, ("car",), q="St. Anton Oberegg", tip="Viewpoint above the Rhine valley and Lake Constance.")
P("Wildhaus", "village", "SG", R, 1090, 47.2030, 9.3530, ("car",))
P("Chäserrugg", "peak", "SG", R, 2262, 47.1555, 9.3115, ("funi", "Unterwasser, Post", 20), tip="Funicular to Iltios, then cable car.")
P("Bad Ragaz", "town", "SG", R, 502, 47.0060, 9.5020, ("train",))
P("Buchs SG", "town", "SG", R, 447, 47.1680, 9.4780, ("train",))
P("Wattwil", "town", "SG", R, 614, 47.2990, 9.0870, ("train",))
P("Pardiel", "peak", "SG", R, 1630, 46.9905, 9.4510, ("cable", "Bad Ragaz, Pizolbahn", 15), tip="Pizol: gondola from Bad Ragaz.")
P("Malbun", "village", "FL", R, 1600, 47.1020, 9.6095, ("car",), tip="Liechtenstein's mountain village.")

# ---------------------------------------------------------------- Graubünden
R = "Graubünden"
P("Chur", "town", "GR", R, 593, 46.8508, 9.5320, ("train",))
P("Brambrüesch", "peak", "GR", R, 1595, 46.8255, 9.5030, ("cable", "Chur, Brambrüeschbahn", 20))
P("Feldis", "village", "GR", R, 1470, 46.7915, 9.4330, ("cable", "Rhäzüns, Feldis-Bahn", 10), q="Feldis/Veulden")
P("Arosa", "village", "GR", R, 1775, 46.7790, 9.6790, ("train",))
P("Arosa Weisshorn", "peak", "GR", R, 2653, 46.7895, 9.6400, ("cable", "Arosa, Weisshornbahn", 20), q="Weisshorn Arosa")
P("Lenzerheide", "village", "GR", R, 1473, 46.7280, 9.5570, ("car",))
P("Parpaner Rothorn", "peak", "GR", R, 2861, 46.7420, 9.6000, ("cable", "Lenzerheide, Rothornbahn", 25))
P("Flims", "village", "GR", R, 1081, 46.8360, 9.2840, ("car",))
P("Crap Sogn Gion", "peak", "GR", R, 2228, 46.8353, 9.2158, ("cable", "Laax, Bergbahnen", 20))
P("Obersaxen", "village", "GR", R, 1281, 46.7490, 9.1010, ("car",), q="Meierhof Obersaxen", tip="Sun terrace of the Surselva.")
P("Brigels", "village", "GR", R, 1287, 46.7700, 9.0620, ("car",), q="Breil/Brigels")
P("Savognin", "village", "GR", R, 1207, 46.5970, 9.5990, ("car",))
P("Bivio", "village", "GR", R, 1769, 46.4690, 9.6510, ("car",))
P("Julierpass", "pass", "GR", R, 2284, 46.4720, 9.7290, ("car",), tip="Open all year.")
P("Splügen", "village", "GR", R, 1457, 46.5520, 9.3220, ("car",))
P("San Bernardino", "village", "GR", R, 1608, 46.4630, 9.1920, ("car",))
P("Davos", "village", "GR", R, 1560, 46.7950, 9.8210, ("train",), q="Davos Platz")
P("Schatzalp", "peak", "GR", R, 1861, 46.8015, 9.8160, ("funi", "Davos Platz, Schatzalpbahn", 4))
P("Jakobshorn", "peak", "GR", R, 2590, 46.7725, 9.8490, ("cable", "Davos Platz, Jakobshornbahn", 20))
P("Weissfluhjoch", "peak", "GR", R, 2663, 46.8330, 9.8065, ("funi", "Davos Dorf, Parsennbahn", 25))
P("Klosters", "village", "GR", R, 1191, 46.8690, 9.8800, ("train",))
P("Madrisa", "peak", "GR", R, 1887, 46.9020, 9.8730, ("cable", "Klosters Dorf, Madrisabahn", 12))

R = "Engadin"
P("St. Moritz", "village", "GR", R, 1822, 46.4980, 9.8390, ("train",))
P("Corviglia", "peak", "GR", R, 2486, 46.5110, 9.8170, ("funi", "St. Moritz, Schulhausplatz", 20))
P("Muottas Muragl", "peak", "GR", R, 2454, 46.5250, 9.9020, ("funi", "Punt Muragl Talstation", 10), tip="Funicular from Punt Muragl; panorama of the Upper Engadin lakes.")
P("Pontresina", "village", "GR", R, 1805, 46.4930, 9.9000, ("train",))
P("Diavolezza", "peak", "GR", R, 2978, 46.4120, 9.9650, ("cable", "Bernina Diavolezza", 10))
P("Ospizio Bernina", "pass", "GR", R, 2253, 46.4110, 10.0220, ("train",), tip="Bernina pass by train; open all year.")
P("Corvatsch", "peak", "GR", R, 3303, 46.4178, 9.8210, ("cable", "Surlej, Corvatschbahn", 20))
P("Sils Maria", "village", "GR", R, 1803, 46.4290, 9.7640, ("car",))
P("Maloja", "village", "GR", R, 1815, 46.4040, 9.6950, ("car",))
P("Zuoz", "village", "GR", R, 1716, 46.6020, 9.9590, ("train",))
P("Scuol", "village", "GR", R, 1243, 46.7970, 10.2980, ("train",))
P("Motta Naluns", "peak", "GR", R, 2146, 46.8140, 10.2790, ("cable", "Scuol-Tarasp", 12))
P("Samnaun", "village", "GR", R, 1840, 46.9440, 10.3600, ("car",))
P("Poschiavo", "town", "GR", R, 1014, 46.3250, 10.0570, ("train",))

# ---------------------------------------------------------------- Bern, Emmental, Fribourg
R = "Bern & Fribourg"
P("Bern", "town", "BE", R, 540, 46.9480, 7.4474, ("train",))
P("Gurten", "hill", "BE", R, 858, 46.9195, 7.4396, ("funi", "Wabern, Gurtenbahn", 5), tip="Bern's local hill; funicular from Wabern.")
P("Bantiger", "hill", "BE", R, 947, 46.9775, 7.5285, ("walk", "Ferenberg", 30), nav=(46.96766, 7.53197), tip="Viewing platform on the transmitter tower.")
P("Chuderhüsi", "hill", "BE", R, 1103, 46.8830, 7.7300, ("car",), tip="Emmental lookout tower facing the Bernese Alps.")
P("Gurnigel", "pass", "BE", R, 1594, 46.7320, 7.4480, ("car",), q="Gurnigel Berghaus", tip="Bern's classic fog escape; road open from Riggisberg in winter.")
P("Fribourg", "town", "FR", R, 610, 46.8065, 7.1620, ("train",))
P("Schwarzsee", "village", "FR", R, 1046, 46.6700, 7.2830, ("car",))
P("Moléson", "peak", "FR", R, 2002, 46.5490, 7.0170, ("cable", "Moléson-sur-Gruyères", 15))
P("Vounetse", "peak", "FR", R, 1627, 46.6262, 7.2076, ("cable", "Charmey, Télécabine", 10))
P("Jaunpass", "pass", "BE", R, 1509, 46.5920, 7.3390, ("car",))
P("Les Paccots", "village", "FR", R, 1061, 46.5230, 6.9470, ("car",))

# ---------------------------------------------------------------- Bernese Oberland
R = "Bernese Oberland"
P("Thun", "town", "BE", R, 560, 46.7580, 7.6280, ("train",))
P("Interlaken", "town", "BE", R, 568, 46.6863, 7.8632, ("train",))
P("Heiligenschwendi", "village", "BE", R, 1124, 46.7480, 7.6678, ("car",), tip="Terrace above Lake Thun.")
P("Beatenberg", "village", "BE", R, 1150, 46.6990, 7.7930, ("car",))
P("Niederhorn", "peak", "BE", R, 1950, 46.7110, 7.7730, ("cable", "Beatenberg, Station", 15))
P("Niesen", "peak", "BE", R, 2362, 46.6450, 7.6510, ("funi", "Mülenen", 30), season="summer")
P("Stockhorn", "peak", "BE", R, 2190, 46.6940, 7.5380, ("cable", "Erlenbach im Simmental, Stockhornbahn", 20))
P("Harder Kulm", "peak", "BE", R, 1322, 46.6973, 7.8516, ("funi", "Interlaken, Harderbahn", 10), season="summer")
P("Axalp", "village", "BE", R, 1535, 46.7170, 8.0400, ("car",))
P("Hasliberg Reuti", "village", "BE", R, 1061, 46.7420, 8.1930, ("car",), q="Reuti Hasliberg")
P("Planplatten", "peak", "BE", R, 2245, 46.7380, 8.2550, ("cable", "Meiringen, Alpbach", 35))
P("Grindelwald", "village", "BE", R, 1034, 46.6240, 8.0410, ("train",))
P("First", "peak", "BE", R, 2168, 46.6600, 8.0540, ("cable", "Grindelwald, Firstbahn", 25))
P("Männlichen", "peak", "BE", R, 2230, 46.6110, 7.9426, ("cable", "Grindelwald Terminal", 20))
P("Kleine Scheidegg", "pass", "BE", R, 2061, 46.5850, 7.9610, ("cog", "Grindelwald", 35))
P("Jungfraujoch", "peak", "BE", R, 3454, 46.5475, 7.9809, ("cog", "Grindelwald Terminal", 50))
P("Wengen", "village", "BE", R, 1274, 46.6080, 7.9220, ("cog", "Lauterbrunnen", 15), tip="Car-free; train from Lauterbrunnen.")
P("Mürren", "village", "BE", R, 1638, 46.5590, 7.8920, ("cable", "Stechelberg, Schilthornbahn", 15), tip="Car-free terrace facing Eiger, Mönch and Jungfrau.")
P("Schilthorn", "peak", "BE", R, 2970, 46.5574, 7.8347, ("cable", "Stechelberg, Schilthornbahn", 35))
P("Lauterbrunnen", "village", "BE", R, 795, 46.5940, 7.9080, ("train",), tip="Deep valley: the cliffs block the low winter sun for most of the day.")
P("Kandersteg", "village", "BE", R, 1176, 46.4950, 7.6740, ("train",))
P("Sunnbüel", "peak", "BE", R, 1934, 46.4560, 7.6380, ("cable", "Kandersteg, Talstation Sunnbüel", 8))
P("Adelboden", "village", "BE", R, 1350, 46.4920, 7.5600, ("car",))
P("Lenk", "village", "BE", R, 1068, 46.4580, 7.4430, ("train",))
P("Rinderberg", "peak", "BE", R, 2004, 46.5340, 7.3600, ("cable", "Zweisimmen, Rinderbergbahn", 25))
P("Gstaad", "village", "BE", R, 1050, 46.4750, 7.2860, ("train",))
P("Saanenmöser", "village", "BE", R, 1269, 46.5170, 7.3100, ("train",))

# ---------------------------------------------------------------- Vaud Alps, Lake Geneva
R = "Lake Geneva & Vaud Alps"
P("Lausanne", "town", "VD", R, 495, 46.5197, 6.6323, ("train",))
P("Genève", "town", "GE", R, 375, 46.2044, 6.1432, ("train",))
P("Montreux", "town", "VD", R, 390, 46.4312, 6.9107, ("train",))
P("Mont Pèlerin", "hill", "VD", R, 806, 46.4970, 6.8191, ("car",))
P("Les Pléiades", "peak", "VD", R, 1360, 46.4824, 6.9084, ("cog", "Vevey", 40))
P("Rochers-de-Naye", "peak", "VD", R, 2042, 46.4320, 6.9760, ("cog", "Montreux", 55))
P("Leysin", "village", "VD", R, 1263, 46.3420, 7.0130, ("car",))
P("La Berneuse", "peak", "VD", R, 2048, 46.3597, 7.0019, ("cable", "Leysin, Télécabine", 12), q="Berneuse")
P("Villars-sur-Ollon", "village", "VD", R, 1250, 46.2990, 7.0560, ("car",))
P("Les Diablerets", "village", "VD", R, 1160, 46.3500, 7.1570, ("car",))
P("Glacier 3000", "peak", "VD", R, 2971, 46.3268, 7.2039, ("cable", "Col du Pillon", 15), q="Scex Rouge")
P("Col des Mosses", "pass", "VD", R, 1445, 46.3950, 7.1010, ("car",))
P("Château-d'Oex", "village", "VD", R, 958, 46.4750, 7.1320, ("train",))

# ---------------------------------------------------------------- Jura and its foot
R = "Jura"
P("St-Cergue", "village", "VD", R, 1047, 46.4460, 6.1570, ("train",))
P("La Givrine", "pass", "VD", R, 1208, 46.4540, 6.1020, ("train",))
P("Vallée de Joux", "village", "VD", R, 1008, 46.6660, 6.3320, ("train",), q="Le Pont")
P("Sainte-Croix", "village", "VD", R, 1086, 46.8220, 6.5030, ("train",))
P("Les Rasses", "village", "VD", R, 1183, 46.8300, 6.5400, ("car",))
P("Neuchâtel", "town", "NE", R, 430, 46.9900, 6.9290, ("train",))
P("Chaumont", "hill", "NE", R, 1087, 47.0260, 6.9582, ("funi", "Neuchâtel, La Coudre", 12))
P("La Vue-des-Alpes", "pass", "NE", R, 1283, 47.0725, 6.8700, ("car",))
P("La Chaux-de-Fonds", "town", "NE", R, 992, 47.1040, 6.8280, ("train",), tip="A whole city that usually sits above the Plateau fog.")
P("Chasseral", "peak", "BE", R, 1548, 47.1320, 7.0560, ("car",), season="summer", q="Chasseral Hôtel", tip="The summit road is closed in winter; then it is a snowshoe walk from Nods.")
P("Mont-Soleil", "hill", "BE", R, 1180, 47.1575, 6.9890, ("funi", "St-Imier, Funiculaire", 5))
P("Biel/Bienne", "town", "BE", R, 434, 47.1368, 7.2468, ("train",))
P("Magglingen", "hill", "BE", R, 875, 47.1390, 7.2140, ("funi", "Biel/Bienne, Magglingenbahn", 10), q="Magglingen/Macolin")
P("Prés-d'Orvin", "village", "BE", R, 1033, 47.1560, 7.1680, ("car",), q="Les Prés-d'Orvin")
P("Solothurn", "town", "SO", R, 432, 47.2088, 7.5323, ("train",))
P("Weissenstein", "peak", "SO", R, 1284, 47.2515, 7.5095, ("cable", "Oberdorf SO", 10), tip="Gondola from Oberdorf; long view over the Plateau fog to the Alps.")
P("Balmberg", "pass", "SO", R, 1078, 47.2650, 7.5490, ("car",))
P("Grenchenberg", "hill", "SO", R, 1300, 47.2290, 7.3880, ("car",), q="Untergrenchenberg")
P("Wasserfallen", "hill", "BL", R, 925, 47.3736, 7.6999, ("cable", "Reigoldswil, Wasserfallenbahn", 10))
P("Belchenflue", "hill", "BL", R, 1099, 47.3650, 7.8080, ("walk", "Chilchzimmersattel", 30), nav=(47.3625, 7.8230))
P("Delémont", "town", "JU", R, 413, 47.3650, 7.3440, ("train",))

# ---------------------------------------------------------------- Northern lowlands
R = "Northern Switzerland"
P("Basel", "town", "BS", R, 260, 47.5596, 7.5886, ("train",))
P("Aarau", "town", "AG", R, 384, 47.3925, 8.0442, ("train",))
P("Baden", "town", "AG", R, 385, 47.4730, 8.3080, ("train",))
P("Schaffhausen", "town", "SH", R, 403, 47.6970, 8.6340, ("train",))
P("Frauenfeld", "town", "TG", R, 405, 47.5560, 8.8980, ("train",))
P("Romanshorn", "town", "TG", R, 406, 47.5660, 9.3790, ("train",))

# ---------------------------------------------------------------- Valais
R = "Valais"
P("Sion", "town", "VS", R, 500, 46.2330, 7.3600, ("train",))
P("Martigny", "town", "VS", R, 471, 46.1020, 7.0730, ("train",))
P("Brig", "town", "VS", R, 678, 46.3170, 7.9880, ("train",))
P("Crans-Montana", "village", "VS", R, 1500, 46.3110, 7.4800, ("car",))
P("Anzère", "village", "VS", R, 1500, 46.2960, 7.3950, ("car",))
P("Leukerbad", "village", "VS", R, 1402, 46.3790, 7.6270, ("car",))
P("Gemmipass", "peak", "VS", R, 2314, 46.3980, 7.6140, ("cable", "Leukerbad, Gemmibahn", 6))
P("Torrent", "peak", "VS", R, 2313, 46.3690, 7.6487, ("cable", "Leukerbad, Torrentbahn", 10), q="Rinderhütte")
P("Lauchernalp", "peak", "VS", R, 1969, 46.4120, 7.7740, ("cable", "Wiler (Lötschen), Luftseilbahn", 5))
P("Verbier", "village", "VS", R, 1500, 46.0960, 7.2280, ("car",))
P("Haute-Nendaz", "village", "VS", R, 1400, 46.1870, 7.3050, ("car",))
P("Ovronnaz", "village", "VS", R, 1350, 46.1990, 7.1730, ("car",))
P("Champex-Lac", "village", "VS", R, 1470, 46.0290, 7.1170, ("car",))
P("Champéry", "village", "VS", R, 1050, 46.1797, 6.8708, ("train",))
P("Les Crosets", "village", "VS", R, 1660, 46.1836, 6.8342, ("car",))
P("Morgins", "village", "VS", R, 1320, 46.2380, 6.8520, ("car",))
P("Evolène", "village", "VS", R, 1371, 46.1130, 7.4960, ("car",))
P("Grimentz", "village", "VS", R, 1572, 46.1800, 7.5760, ("car",))
P("St-Luc", "village", "VS", R, 1655, 46.2210, 7.5980, ("car",))
P("Chandolin", "village", "VS", R, 1936, 46.2510, 7.5930, ("car",), tip="One of the highest year-round villages in the Alps.")
P("Zinal", "village", "VS", R, 1675, 46.1350, 7.6260, ("car",))
P("Vercorin", "village", "VS", R, 1322, 46.2570, 7.5300, ("car",))
P("Zermatt", "village", "VS", R, 1608, 46.0207, 7.7491, ("cog", "Täsch", 12), tip="Car-free: park in Täsch and take the shuttle train.")
P("Sunnegga", "peak", "VS", R, 2288, 46.0174, 7.7701, ("funi", "Täsch", 30))
P("Gornergrat", "peak", "VS", R, 3089, 45.9830, 7.7850, ("cog", "Täsch", 55))
P("Matterhorn Glacier Paradise", "peak", "VS", R, 3883, 45.9385, 7.7300, ("cable", "Täsch", 70), q="Klein Matterhorn")
P("Saas-Fee", "village", "VS", R, 1798, 46.1080, 7.9270, ("car",))
P("Grächen", "village", "VS", R, 1619, 46.1950, 7.8380, ("car",))
P("Riederalp", "village", "VS", R, 1925, 46.3780, 8.0280, ("cable", "Mörel", 10), tip="Car-free terrace above the Rhône valley, next to the Aletsch glacier.")
P("Bettmeralp", "village", "VS", R, 1970, 46.3900, 8.0620, ("cable", "Bettmeralp Talstation (Seilb.)", 10))
P("Eggishorn", "peak", "VS", R, 2869, 46.4270, 8.0930, ("cable", "Fiesch", 25))
P("Belalp", "village", "VS", R, 2094, 46.3720, 7.9680, ("cable", "Blatten bei Naters", 10))
P("Rosswald", "village", "VS", R, 1820, 46.3035, 8.0415, ("cable", "Ried-Brig, Rosswaldbahn", 8))
P("Simplonpass", "pass", "VS", R, 2005, 46.2510, 8.0330, ("car",), tip="Open all year.")
P("Münster", "village", "VS", R, 1370, 46.4880, 8.2640, ("train",), q="Münster VS")

# ---------------------------------------------------------------- Ticino
R = "Ticino"
P("Lugano", "town", "TI", R, 273, 46.0037, 8.9511, ("train",))
P("Locarno", "town", "TI", R, 200, 46.1680, 8.7940, ("train",))
P("Bellinzona", "town", "TI", R, 230, 46.1950, 9.0240, ("train",))
P("Monte Brè", "hill", "TI", R, 925, 46.0090, 8.9870, ("funi", "Lugano, Cassarate Monte Brè", 20))
P("Monte San Salvatore", "hill", "TI", R, 912, 45.9770, 8.9460, ("funi", "Lugano-Paradiso", 12), tip="The funicular pauses for part of the winter.")
P("Monte Generoso", "peak", "TI", R, 1601, 45.9300, 9.0190, ("cog", "Capolago", 40), season="summer", q="Generoso Vetta")
P("Cardada", "peak", "TI", R, 1340, 46.1990, 8.7860, ("cable", "Orselina", 5))
P("Cimetta", "peak", "TI", R, 1670, 46.2010, 8.7900, ("cable", "Orselina", 25))
P("Alpe Foppa", "peak", "TI", R, 1530, 46.1180, 8.9030, ("cable", "Rivera", 20), season="summer", tip="Monte Tamaro gondola from Rivera.")
P("Airolo", "village", "TI", R, 1175, 46.5280, 8.6090, ("train",))
P("Carì", "village", "TI", R, 1640, 46.4950, 8.8200, ("car",))
P("Bosco Gurin", "village", "TI", R, 1506, 46.3170, 8.4900, ("car",), tip="Highest village in Ticino.")
