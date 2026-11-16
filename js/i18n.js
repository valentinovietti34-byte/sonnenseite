/* Sonnenseite - German interface.
   The app is written in English; in German mode this layer translates every text the app puts on screen
   (text nodes plus aria-label, title, placeholder and alt), including text added later. Unknown text stays English.
   Language: Settings > Display > Language, default from the device language. */
(function () {
  'use strict';
  const SS = (window.SS = window.SS || {});
  const I = (SS.i18n = { lang: 'en', tr: (s) => s });
  let pref = '';
  try { pref = (JSON.parse(localStorage.getItem('ss.settings.v1') || '{}') || {}).lang || ''; } catch (e) { /* storage blocked */ }
  const device = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
  I.lang = pref === 'de' || pref === 'en' ? pref : device.startsWith('de') || device.endsWith('-ch') ? 'de' : 'en';
  if (I.lang !== 'de') return;
  document.documentElement.lang = 'de-CH';

  const EXACT = {
    /* header, time bar, navigation */
    'Swiss sun finder': 'Sonnenfinder Schweiz', 'Now': 'Jetzt', 'Map': 'Karte', 'List': 'Liste', 'Filters': 'Filter', 'Sort': 'Sortieren',
    'Today': 'Heute', 'Tomorrow': 'Morgen', 'Yesterday': 'Gestern', 'My position': 'Mein Standort', 'Map point': 'Kartenpunkt',
    'Change your starting point': 'Startpunkt ändern', 'Refresh data': 'Daten aktualisieren', 'Settings': 'Einstellungen', 'Map layers': 'Kartenebenen',
    'Show my position': 'Meinen Standort zeigen', 'Day and time': 'Tag und Zeit', 'Hour of day': 'Uhrzeit', 'Sun finder': 'Sonnenfinder', 'Place details': 'Ortsdetails',
    'Best trip': 'Bester Ausflug', 'Most sun': 'Meiste Sonne', 'Closest': 'Am nächsten', 'Highest': 'Am höchsten', 'Name': 'Name',
    /* brief */
    'Loading forecast': 'Prognose wird geladen', 'Looking for the sun…': 'Die Sonne wird gesucht…', 'Low cloud at every height': 'Tiefe Wolken in allen Höhen',
    'Patchy low cloud': 'Lückenhafte tiefe Wolken', 'No fog. The sun is out': 'Kein Nebel. Die Sonne scheint', 'No fog, but cloud higher up': 'Kein Nebel, aber Wolken weiter oben',
    'No fog tonight': 'Heute Nacht kein Nebel', 'No forecast for this hour': 'Keine Prognose für diese Stunde', 'Pick another hour or day.': 'Wähle eine andere Stunde oder einen anderen Tag.',
    'Around': 'Rund um', 'Details': 'Details', 'Show': 'Anzeigen', 'Your starting point': 'Dein Startpunkt',
    'No real sunshine within reach for the rest of today': 'Für den Rest des Tages keine richtige Sonne in Reichweite',
    'No real sunshine within reach that day': 'An diesem Tag keine richtige Sonne in Reichweite',
    'Try another day, or raise the travel limit in Filters.': 'Versuch einen anderen Tag oder erhöhe die Reisezeit unter Filter.',
    /* list */
    'Where the sun is today': 'Wo heute die Sonne scheint', 'Where the sun is tomorrow': 'Wo morgen die Sonne scheint', 'Where the sun is': 'Wo die Sonne scheint',
    'sun left': 'Sonne noch', 'of sun': 'Sonne', 'Sun likely': 'Sonne wahrscheinlich', 'Sun unlikely': 'Sonne unwahrscheinlich', 'Above the fog': 'Über dem Nebel',
    'Usually closed in winter': 'Im Winter meist geschlossen', 'No lift departures in the timetable': 'Keine Bahnfahrten im Fahrplan',
    'Measured sunny nearby': 'In der Nähe sonnig gemessen', 'Saved': 'Gespeichert',
    'No places match your filters. Open Filters and widen the travel time or altitude range.': 'Keine Orte passen zu deinen Filtern. Öffne die Filter und erweitere Reisezeit oder Höhenbereich.',
    /* map */
    'Light': 'Hell', 'Grey': 'Grau', 'Fog on': 'Nebel an', 'Fog off': 'Nebel aus', 'Fog on the map': 'Nebel auf der Karte', 'Fog shown on the map': 'Nebel auf der Karte eingeblendet', 'Fog hidden': 'Nebel ausgeblendet', 'Topo': 'Topo', 'Winter': 'Winter', 'Aerial': 'Luftbild', 'Sea of fog': 'Nebelmeer', 'terrain below the fog top': 'Gelände unter der Nebelobergrenze',
    'Measured sunshine': 'Gemessene Sonne', 'MeteoSwiss stations, last 10 min': 'MeteoSchweiz-Stationen, letzte 10 Min.', 'Webcams': 'Webcams',
    'Set the fog top by hand': 'Nebelobergrenze von Hand setzen', 'automatic': 'automatisch', 'none': 'keine', 'full sun': 'volle Sonne',
    'Sun not visible from here right now': 'Sonne von hier aus gerade nicht sichtbar', 'Open live webcam': 'Live-Webcam öffnen',
    'This spot': 'Dieser Ort', 'Looking up the height…': 'Höhe wird ermittelt…', 'Height unknown': 'Höhe unbekannt', 'Start from here': 'Hier starten', 'Navigate': 'Navigieren',
    'No estimate here': 'Hier keine Schätzung', 'Sun below the horizon': 'Sonne unter dem Horizont', 'Fog or low cloud': 'Nebel oder tiefe Wolken', 'Cloudy': 'Bewölkt',
    'Estimated from the regional forecast. Mountains around this point are not taken into account, so in a valley it can look too sunny.': 'Geschätzt aus der regionalen Prognose. Berge rund um diesen Punkt sind nicht berücksichtigt, im Tal kann es darum zu sonnig aussehen.',
    /* weather words */
    'Night': 'Nacht', 'Sun behind the mountains': 'Sonne hinter den Bergen', 'Sunny above the fog': 'Sonnig über dem Nebel', 'Sunny': 'Sonnig', 'Mostly sunny': 'Meist sonnig',
    'Some sun': 'Etwas Sonne', 'In fog': 'Im Nebel', 'Low cloud or high fog': 'Tiefe Wolken oder Hochnebel', 'Mid-level cloud': 'Mittelhohe Wolken',
    'Partly behind the mountains': 'Teils hinter den Bergen', 'Broken low cloud': 'Aufgelockerte tiefe Wolken', 'Veiled sun': 'Verschleierte Sonne',
    /* place sheet */
    'Back to the list': 'Zurück zur Liste', 'Save this place': 'Ort speichern', 'Remove from saved places': 'Aus gespeicherten Orten entfernen',
    'Sun today': 'Sonne heute', 'Sun that day': 'Sonne an diesem Tag', 'Sunny from': 'Sonnig von', 'not expected': 'nicht erwartet', 'Terrain lets sun in': 'Sonne über dem Gelände',
    'not at all': 'gar nicht', 'Temperature': 'Temperatur', 'Strongest gusts': 'Stärkste Böen', 'Snow depth': 'Schneehöhe', 'Hour by hour': 'Stunde für Stunde',
    'sun': 'Sonne', 'some sun': 'etwas Sonne', 'cloud or fog': 'Wolken oder Nebel', 'sun behind mountains': 'Sonne hinter Bergen', 'night': 'Nacht', 'Coming days': 'Nächste Tage',
    'Checking the lift timetable…': 'Fahrplan der Bahn wird geprüft…', 'within 6 km': 'im Umkreis von 6 km',
    'No webcam in the built-in directory near this place.': 'Im eingebauten Verzeichnis gibt es keine Webcam in der Nähe.', 'Search more webcams': 'Weitere Webcams suchen',
    'Labels on the pictures come from an automatic check of the latest image:': 'Die Hinweise auf den Bildern stammen aus einer automatischen Prüfung des neusten Bildes:',
    'Blue sky': 'Blauer Himmel', 'Fog or cloud': 'Nebel oder Wolken', 'or': 'oder', '. When the check cannot tell, there is no label.': '. Wenn die Prüfung unsicher ist, gibt es keinen Hinweis.',
    'Open in a new tab': 'In neuem Tab öffnen', 'Getting there': 'Anreise', 'Route on map': 'Route auf der Karte', 'Public transport stop:': 'Haltestelle:',
    'No public transport stop next to this place.': 'Keine ÖV-Haltestelle in der Nähe.', 'Next connections': 'Nächste Verbindungen', 'SBB timetable': 'SBB-Fahrplan',
    'Transit in Google Maps': 'ÖV in Google Maps', 'Hiking map': 'Wanderkarte', 'Loading the next connections…': 'Nächste Verbindungen werden geladen…',
    'Sun and mountains': 'Sonne und Berge', 'dashed: 21 June and 21 December': 'gestrichelt: 21. Juni und 21. Dezember', 'E': 'O', 'SE': 'SO',
    'Measured nearby': 'In der Nähe gemessen', 'the sun is not visible from the station right now': 'die Sonne ist von der Station aus gerade nicht sichtbar',
    'This spot is close to the top of the fog. The weather model places it inside the fog, but ground at this height nearby is forecast clear, so it is shown as sunny. A look at the webcam settles it.':
      'Dieser Ort liegt nahe an der Nebelobergrenze. Das Wettermodell sieht ihn im Nebel, für Gelände auf dieser Höhe in der Nähe ist es aber klar, darum wird er sonnig angezeigt. Ein Blick auf die Webcam klärt es.',
    'Summit': 'Gipfel', 'Viewpoint': 'Aussichtspunkt', 'Mountain village': 'Bergdorf', 'Pass': 'Pass', 'Town': 'Stadt',
    /* settings */
    'Settings and filters': 'Einstellungen und Filter', 'Close settings': 'Einstellungen schliessen', 'Starting point': 'Startpunkt', 'Now:': 'Jetzt:',
    'Use my position (GPS)': 'Meinen Standort verwenden (GPS)', 'Search a place in Switzerland': 'Ort in der Schweiz suchen', 'Town, village or postcode': 'Ort, Dorf oder Postleitzahl',
    'Quick picks': 'Schnellwahl', 'Trip': 'Ausflug', 'How you travel': 'Unterwegs mit', 'By car': 'Auto', 'By public transport': 'Öffentlicher Verkehr',
    'By public transport, the best-placed spots get real times from the Swiss timetable; the rest are estimates until checked.': 'Mit dem ÖV bekommen die besten Orte echte Zeiten aus dem Fahrplan; die übrigen sind Schätzungen, bis sie geprüft sind.',
    'Longest trip, one way': 'Längste Reise, einfache Fahrt', 'Prefer closer places': 'Nähere Orte bevorzugen', 'sun matters most': 'Sonne zählt am meisten', 'balanced': 'ausgewogen', 'strongly': 'stark',
    'Used by the "Best trip" order: each extra hour on the road has to earn this many extra hours of sun.': 'Gilt für die Sortierung «Bester Ausflug»: Jede zusätzliche Stunde unterwegs muss so viele zusätzliche Sonnenstunden bringen.',
    'Places': 'Orte', 'Lowest altitude': 'Tiefste Höhe', 'Highest altitude': 'Höchste Höhe',
    'Useful if you do not want to go high: thin air, cold, or a lift you would rather skip.': 'Praktisch, wenn du nicht hoch hinaus willst: dünne Luft, Kälte oder eine Bahn, die du lieber auslässt.',
    'Kinds of place': 'Art des Ortes', 'Summits': 'Gipfel', 'Viewpoints': 'Aussichtspunkte', 'Mountain villages': 'Bergdörfer', 'Passes': 'Pässe', 'Towns': 'Städte',
    'Hide places whose lift or road is usually closed in winter': 'Orte ausblenden, deren Bahn oder Strasse im Winter meist geschlossen ist', 'Only my saved places': 'Nur meine gespeicherten Orte',
    'Forecast': 'Prognose', 'Weather model': 'Wettermodell', 'Best match': 'Beste Wahl', 'Replay a past day': 'Vergangenen Tag nachspielen', 'Back to the live forecast': 'Zurück zur aktuellen Prognose',
    'ICON-D2 (2 km) for two days, then ICON-EU. Recommended.': 'ICON-D2 (2 km) für zwei Tage, dann ICON-EU. Empfohlen.', '2 km Swiss model, 5 days.': 'Schweizer 2-km-Modell, 5 Tage.',
    '1 km Swiss model, 33 hours only.': 'Schweizer 1-km-Modell, nur 33 Stunden.', '2 km, 48 hours.': '2 km, 48 Stunden.', '1.5 km, 2 days.': '1,5 km, 2 Tage.',
    'Global 25 km model; smooths out fog. For comparison.': 'Globales 25-km-Modell; glättet Nebel weg. Zum Vergleich.',
    'Loads the archived forecast for that date, for example a classic fog day such as 13 December 2025. Live measurements are hidden while replaying.': 'Lädt die archivierte Prognose für dieses Datum, zum Beispiel einen typischen Nebeltag wie den 13. Dezember 2025. Messwerte sind dabei ausgeblendet.',
    'Display': 'Anzeige', 'Units': 'Einheiten', 'Metres, °C, km': 'Meter, °C, km', 'Feet, °F, miles': 'Fuss, °F, Meilen', 'Theme': 'Design', 'Match device': 'Wie Gerät', 'Dark': 'Dunkel',
    'Language': 'Sprache', 'Places by travel time and altitude, with the fog layer': 'Orte nach Reisezeit und Höhe, mit der Nebelschicht', 'Sun path over the terrain horizon': 'Sonnenbahn über der Horizontlinie', 'How it works': 'So funktioniert es', 'Reset all settings': 'Alle Einstellungen zurücksetzen', 'Clear cached data': 'Zwischenspeicher leeren',
    'Near the top of the fog a difference of 100 m decides between grey and blue sky, and no forecast is that precise. That is why the measured sunshine and the webcams are one tap away.': 'An der Nebelobergrenze entscheiden 100 m zwischen grauem und blauem Himmel, und so genau ist keine Prognose. Darum sind die gemessene Sonne und die Webcams nur einen Tipp entfernt.',
    'Nothing found.': 'Nichts gefunden.',
    /* messages */
    'Finding your position…': 'Standort wird gesucht…', 'Starting point set to your position.': 'Startpunkt auf deinen Standort gesetzt.', 'Starting point changed.': 'Startpunkt geändert.',
    'Starting point set to this spot.': 'Startpunkt auf diesen Ort gesetzt.', 'Removed from saved places': 'Aus gespeicherten Orten entfernt', 'Finding the route…': 'Route wird gesucht…',
    'No route found. The routing service may be busy.': 'Keine Route gefunden. Der Routendienst ist vielleicht ausgelastet.', 'Cached data cleared.': 'Zwischenspeicher geleert.', 'Retry': 'Erneut versuchen',
    'Location access was refused. Allow it for this page, or choose a starting point in Settings.': 'Der Standortzugriff wurde verweigert. Erlaube ihn für diese Seite oder wähle einen Startpunkt in den Einstellungen.',
    'Location access is off. Turn it on for Sonnenseite in your phone settings, or choose a starting point in Settings.': 'Der Standortzugriff ist aus. Schalte ihn für Sonnenseite in den Telefoneinstellungen ein oder wähle einen Startpunkt in den Einstellungen.',
    'Could not get your position. Choose a starting point in Settings.': 'Dein Standort konnte nicht ermittelt werden. Wähle einen Startpunkt in den Einstellungen.',
    'The weather service has hit its request limit for your network. Try again in a while.': 'Der Wetterdienst hat das Abfragelimit für dein Netzwerk erreicht. Versuch es später nochmals.',
    'No connection to the weather service. Check your internet connection.': 'Keine Verbindung zum Wetterdienst. Prüfe deine Internetverbindung.',
  };

  const WD = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' };
  const MO = { Jan: 'Jan', Feb: 'Feb', Mar: 'Mär', Apr: 'Apr', May: 'Mai', Jun: 'Jun', Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Okt', Nov: 'Nov', Dec: 'Dez' };
  const ACC = { 'cable car': 'Seilbahn', funicular: 'Standseilbahn', 'mountain railway': 'Bergbahn', walk: 'zu Fuss' };
  const CONF = { 'Sun likely': 'Sonne wahrscheinlich', '50/50': '50/50', 'Sun unlikely': 'Sonne unwahrscheinlich' };
  const REGION = { 'Central Switzerland': 'Zentralschweiz', 'Eastern Switzerland': 'Ostschweiz', 'Bernese Oberland': 'Berner Oberland', 'Lake Geneva & Vaud Alps': 'Genfersee & Waadtländer Alpen', 'Northern Switzerland': 'Nordschweiz', Valais: 'Wallis', Ticino: 'Tessin', 'Bern & Fribourg': 'Bern & Freiburg' };
  /* "at 09:00", "at Tomorrow 12:00", "at Wed 18 12:00" */
  const when = (w) => w.replace(/^Tomorrow (\d\d:\d\d)$/, 'morgen um $1').replace(/^Today (\d\d:\d\d)$/, 'heute um $1').replace(/^(\w{3}) (\d{1,2}) (\d\d:\d\d)$/, (m, d, n, t) => 'am ' + (WD[d] || d) + ' ' + n + '. um ' + t).replace(/^(\d\d:\d\d)$/, 'um $1');

  const RULES = [
    [/^Fog up to about (.+)$/, 'Nebel bis etwa $1'],
    [/^at (.+?) the low cloud ends between (.+?) and (.+?)\. (You are under it; above that line the sky is open\.|You are above it\.)$/, (m, w, a, b, x) => when(w) + ' endet die tiefe Bewölkung zwischen ' + a + ' und ' + b + '. ' + (/under/.test(x) ? 'Du bist darunter; darüber ist der Himmel offen.' : 'Du bist darüber.')],
    [/^at (.+?) there is no clear layer up to (.+?)\. Going up will not help nearby; look further away\.$/, (m, w, a) => when(w) + ' gibt es bis ' + a + ' keine wolkenfreie Schicht. Höher hinauf hilft in der Nähe nicht; schau weiter weg.'],
    [/^at (.+?) the low cloud is broken\. Sun and grey take turns\.$/, (m, w) => when(w) + ' ist die tiefe Bewölkung lückenhaft. Sonne und Grau wechseln sich ab.'],
    [/^at (.+?) the lowlands are free of low cloud\.$/, (m, w) => when(w) + ' ist das Flachland frei von tiefen Wolken.'],
    [/^at (.+?) the air is clear below the cloud line\.$/, (m, w) => when(w) + ' ist die Luft unter der Wolkengrenze klar.'],
    [/^Fetching the forecast for (\d+) places and the latest MeteoSwiss measurements\.$/, 'Die Prognose für $1 Orte und die neusten Messwerte von MeteoSchweiz werden geladen.'],
    [/^Right now · /, 'Jetzt · '], [/^Forecast · /, 'Prognose · '], [/^Replay of /, 'Rückblick auf '],
    [/^Measured (\d\d:\d\d): sunshine from (.+?) \((.+?)\), grey up to (.+?) \((.+?)\)\.$/, 'Gemessen $1: Sonne ab $2 ($3), grau bis $4 ($5).'],
    [/^Measured (\d\d:\d\d): no sunshine at any station nearby, up to (.+?) \((.+?)\)\.$/, 'Gemessen $1: keine Sonne an den Stationen in der Nähe, bis $2 ($3).'],
    [/^Measured (\d\d:\d\d): the stations around you report sunshine\.$/, 'Gemessen $1: Die Stationen um dich herum melden Sonne.'],
    [/^Measured (\d\d:\d\d): sun and cloud mixed at the low stations\.$/, 'Gemessen $1: Sonne und Wolken gemischt an den tiefen Stationen.'],
    [/^Measured (\d\d:\d\d)$/, 'Gemessen $1'],
    [/^Travel time from (.+) →$/, 'Reisezeit ab $1 →'], [/^fog top (.+?) to (.+)$/, 'Nebelobergrenze $1 bis $2'],
    [/^(?:(.+?) away · )?(.+?) of sun( after you arrive)?( · above the fog)?$/, (m, t, s, a, f) => (t ? t + ' entfernt · ' : '') + s + ' Sonne' + (a ? ' nach der Ankunft' : '') + (f ? ' · über dem Nebel' : '')],
    [/^Tomorrow: (.+)$/, 'Morgen: $1'],
    [/^(Sun likely|50\/50|Sun unlikely) · about (.+?) of sun(?: · (.+?) away)?$/, (m, c, s, t) => CONF[c] + ' · etwa ' + s + ' Sonne' + (t ? ' · ' + t + ' entfernt' : '')],
    [/^Where the sun is on (.+)$/, 'Wo am $1 die Sonne scheint'],
    [/ by train$/, ' mit ÖV'],
    [/^(\d+) min (cable car|funicular|mountain railway|walk)$/, (m, n, a) => n + ' Min. ' + ACC[a]],
    [/^Lift running, last (\d\d:\d\d)$/, 'Bahn fährt, letzte $1'],
    [/^Webcam (\d\d:\d\d): blue sky$/, 'Webcam $1: blauer Himmel'], [/^Webcam (\d\d:\d\d): fog or cloud$/, 'Webcam $1: Nebel oder Wolken'],
    [/^Blue sky · (\d\d:\d\d)$/, 'Blauer Himmel · $1'], [/^Fog or cloud · (\d\d:\d\d)$/, 'Nebel oder Wolken · $1'],
    [/^Hour by hour, (\d+):00 to (\d+):00$/, 'Stunde für Stunde, $1 bis $2 Uhr'],
    [/^Show (\d+) more places$/, '$1 weitere Orte zeigen'],
    [/^Sunshine at (\d\d:\d\d)$/, 'Sonne um $1'], [/^(\d+) of 10 min$/, '$1 von 10 Min.'],
    [/^MeteoSwiss station · /, 'MeteoSchweiz-Station · '], [/^Sunshine:$/, 'Sonne:'], [/^Temperature: /, 'Temperatur: '], [/ · Humidity: /, ' · Feuchte: '],
    [/^at (.+?) · about (\d+) min of sun in this hour$/, (m, w, n) => when(w) + ' · etwa ' + n + ' Min. Sonne in dieser Stunde'],
    [/^at (.+)$/, (m, w) => when(w)],
    [/^(.+?) · about (.+?) of sun (today|that day)$/, (m, a, s, d) => a + ' · etwa ' + s + ' Sonne ' + (d === 'today' ? 'heute' : 'an diesem Tag')],
    [/ · (Summit|Viewpoint|Mountain village|Pass|Town) · /, (m, k) => ' · ' + EXACT[k] + ' · '],
    [/ · (Central Switzerland|Eastern Switzerland|Bernese Oberland|Lake Geneva & Vaud Alps|Northern Switzerland|Valais|Ticino|Bern & Fribourg)$/, (m, r) => ' · ' + REGION[r]],
    [/^Sun likely: the forecast is clear-cut here\./, 'Sonne wahrscheinlich: Die Prognose ist hier eindeutig.'],
    [/^50\/50: this spot is close to the top of the fog, or the cloud forecast is borderline\. Check the webcam before you go\./, '50/50: Dieser Ort liegt nahe an der Nebelobergrenze oder die Wolkenprognose ist knapp. Schau vor der Abfahrt auf die Webcam.'],
    [/^Sun unlikely here on this day\./, 'Sonne hier an diesem Tag unwahrscheinlich.'],
    [/ Includes sunshine measured nearby in the last 10 minutes\.$/, ' Enthält die in den letzten 10 Minuten in der Nähe gemessene Sonne.'],
    [/^(-?\d+°) to (-?\d+°)$/, '$1 bis $2'],
    [/^The lift or road to (.+) is usually closed in winter\. Check the operator before you go\.$/, 'Bahn oder Strasse nach $1 sind im Winter meist geschlossen. Frag vor der Fahrt beim Betreiber nach.'],
    [/^The timetable shows no departures from (.+?) on (.+?)\. The lift is probably not running, for example during its annual maintenance\. Check with the operator\.$/, 'Der Fahrplan zeigt am $2 keine Abfahrten ab $1. Die Bahn fährt wahrscheinlich nicht, etwa wegen der jährlichen Revision. Frag beim Betreiber nach.'],
    [/^Lift running: (\d+) departures from (.+?) in the timetable on (.+?), the last at$/, 'Bahn fährt: $1 Abfahrten ab $2 laut Fahrplan am $3, die letzte um'],
    [/^(.+?) · (.+?) away$/, '$1 · $2 entfernt'],
    [/^from (.+)$/, 'ab $1'],
    [/^(\d.*?) by car, (.+?)( to (.+))?$/, (m, a, b, c, d) => a + ' mit dem Auto, ' + b + (d ? ' bis ' + d : '')],
    [/^\(estimate\) /, '(geschätzt) '], [/in total: /, 'insgesamt: '], [/ by car to /, ' mit dem Auto bis '], [/, then (\d+) min (cable car|funicular|mountain railway|walk)/, (m, n, a) => ', dann ' + n + ' Min. ' + ACC[a]], [/(^| )by car( |\.|,|$)/, '$1mit dem Auto$2'],
    [/^\((\d+) m away\)$/, '($1 m entfernt)'],
    [/ · direct( · |$)/, ' · direkt$1'], [/ · 1 change( · |$)/, ' · 1 Umstieg$1'], [/ · (\d+) changes( · |$)/, ' · $1 Umstiege$2'],
    [/^No timetable connection to (.+?) itself right now, so the lift may not be running\. These go to the valley station, (.+)\.$/, 'Im Fahrplan gibt es gerade keine Verbindung bis $1, die Bahn fährt also vielleicht nicht. Diese Verbindungen führen zur Talstation $2.'],
    [/^The timetable shows no connection to (.+?) right now\.( The lift may not be running\.)?$/, (m, a, b) => 'Der Fahrplan zeigt gerade keine Verbindung nach ' + a + '.' + (b ? ' Die Bahn fährt vielleicht nicht.' : '')],
    [/^Could not load connections: /, 'Verbindungen konnten nicht geladen werden: '],
    [/^The dark shape is the skyline seen from (.+?)\. The sun shines here only while its path runs above it: on this day from (.+?) to (.+?), (.+?) at most\.$/, 'Die dunkle Fläche ist die Horizontlinie von $1 aus. Die Sonne scheint hier nur, solange ihre Bahn darüber verläuft: an diesem Tag von $2 bis $3, höchstens $4.'],
    [/^The dark shape is the skyline seen from (.+?)\. The sun shines here only while its path runs above it\. On this day it never clears the skyline\.$/, 'Die dunkle Fläche ist die Horizontlinie von $1 aus. Die Sonne scheint hier nur, solange ihre Bahn darüber verläuft. An diesem Tag kommt sie nie darüber.'],
    [/^(.+?) \((.+?), (.+?) away\):$/, '$1 ($2, $3 entfernt):'],
    [/^(\d+) of the last 10 minutes sunny$/, '$1 der letzten 10 Minuten sonnig'], [/(\d+)% humidity\.$/, '$1 % Feuchte.'],
    [/^, (.+?) m\. Travel times and the fog brief are worked out from here\.$/, ', $1 m. Reisezeiten und Nebellage werden von hier aus berechnet.'],
    [/^Loaded (\d\d:\d\d)\. The forecast refreshes by itself after an hour; measurements every 10 minutes\.$/, 'Geladen um $1. Die Prognose aktualisiert sich nach einer Stunde von selbst, die Messwerte alle 10 Minuten.'],
    [/^For each of (\d+) places the app combines three things: .*$/, 'Für jeden der $1 Orte kombiniert die App drei Dinge: die Prognose für tiefe, mittelhohe und hohe Wolken; die echte Horizontlinie, damit sie weiss, wann Berge die tiefe Wintersonne verdecken; und die Nebelobergrenze, abgeleitet daraus, wie sich die tiefen Wolken mit der Höhe über benachbarte Orte verändern. Die Umrechnung von Wolken in Sonne wurde mit Sonnenschein-Messungen von MeteoSchweiz kalibriert.'],
    [/^Data: Open-Meteo .*$/, 'Daten: Open-Meteo (Prognose, CC BY 4.0), MeteoSchweiz (Messwerte), swisstopo (Karten, Ortsnamen), OpenStreetMap-Mitwirkende (Webcam-Standorte), OSRM (Strassenrouting), transport.opendata.ch (Fahrplan), Mapzen-Geländedaten auf AWS. Webcambilder gehören ihren Betreibern.'],
    [/^Search failed: /, 'Suche fehlgeschlagen: '],
    [/^You seem to be outside Switzerland, so (.+) stays the starting point\.$/, 'Du scheinst ausserhalb der Schweiz zu sein, darum bleibt $1 der Startpunkt.'],
    [/^Starting point: (.+)$/, 'Startpunkt: $1'],
    [/^Showing the forecast from (\d\d:\d\d)\. /, 'Angezeigt wird die Prognose von $1. '], [/^Could not load the forecast\. /, 'Die Prognose konnte nicht geladen werden. '],
    [/^Near (.+)$/, 'Bei $1'],
    /* credits line */
    [/Forecast: (.+?) via Open-Meteo, loaded (\d\d:\d\d)/, (m, n, t) => 'Prognose: ' + (n === 'Best match' ? 'Beste Wahl' : n) + ' über Open-Meteo, geladen ' + t], [/ \(could not refresh\)/, ' (konnte nicht aktualisiert werden)'],
    [/Measurements: MeteoSwiss, /, 'Messwerte: MeteoSchweiz, '], [/Travel times: OSRM road routing\./, 'Reisezeiten: OSRM-Strassenrouting.'], [/Travel times: estimated from distance\./, 'Reisezeiten: aus der Distanz geschätzt.'],
    [/Sunshine is an estimate, not a promise: check the webcam before you leave\./, 'Die Sonne ist eine Schätzung, kein Versprechen: Schau vor der Abfahrt auf die Webcam.'],
    /* dates and numbers, always last */
    [/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2})\b(?!:)/g, (m, d, n) => WD[d] + ' ' + n + '.'],
    [/\b(\d{1,2})\.? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m, n, mo) => n + '. ' + MO[mo]],
    [/ · (fog|cloud|sun)$/, (m, w) => ' · ' + { fog: 'Nebel', cloud: 'Wolken', sun: 'Sonne' }[w]],
    [/(\d),(\d{3})(?=\s?(m|ft)\b)/g, '$1’$2'], [/(\d)\.(\d)(?=\s?(h|km|mi)\b)/g, '$1,$2'],
  ];

  function tr(str) {
    if (!str || !/[A-Za-z]/.test(str)) return str;
    const lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], core = str.trim();
    let out = EXACT[core];
    if (out == null) {
      out = core;
      for (let k = 0; k < RULES.length; k++) out = out.replace(RULES[k][0], RULES[k][1]);
    }
    return lead + out + trail;
  }
  I.tr = tr;
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1 };
  function fixText(node) {
    const p = node.parentNode;
    if (!p || SKIP[p.nodeName]) return;
    const v = node.nodeValue, t = tr(v);
    if (t !== v) node.nodeValue = t;
  }
  function fixEl(el) {
    for (let k = 0; k < ATTRS.length; k++) {
      const v = el.getAttribute && el.getAttribute(ATTRS[k]);
      if (v) { const t = tr(v); if (t !== v) el.setAttribute(ATTRS[k], t); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    fixEl(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = it.nextNode())) { if (n.nodeType === 3) fixText(n); else if (!SKIP[n.nodeName]) fixEl(n); }
  }
  new MutationObserver((muts) => {
    for (let k = 0; k < muts.length; k++) {
      const m = muts[k];
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  walk(document.body || document.documentElement);
})();
