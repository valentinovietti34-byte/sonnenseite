"""Hand-checked webcam pages found through web search (official operator, tourism or established listing pages).
Coordinates are taken from the matching place in data/places.js, or given explicitly."""
import json, os
_s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "places.js")).read()
_P = {p["n"]: p for p in json.loads(_s[_s.index("["):_s.rindex("]") + 1])}


def at(place):
    return _P[place]["la"], _P[place]["lo"]


_E = [
    ("Titlis", at("Titlis"), "https://titlis.roundshot.com/titlis/"),
    ("Trübsee", at("Trübsee"), "https://titlis.roundshot.com/alpstubli-truebsee/"),
    ("Fürenalp (Engelberg)", (46.8014, 8.4688), "https://fuerenalp.roundshot.com/"),
    ("Luzern", at("Luzern"), "https://luzerntourismus.roundshot.com/"),
    ("Chäserrugg", at("Chäserrugg"), "https://chaeserrugg.roundshot.com/"),
    ("Braunwald", at("Braunwald"), "https://braunwald.roundshot.com/"),
    ("Kronberg summit", at("Kronberg"), "https://kronberg.roundshot.com/gipfel/"),
    ("Schwägalp", at("Schwägalp"), "https://saentis.roundshot.com/schwaegalp/"),
    ("Flumserberg Prodkamm", (47.0787, 9.2553), "https://flumserberg.roundshot.com/prodkamm"),
    ("Weissenstein", at("Weissenstein"), "https://ga-weissenstein.roundshot.com/"),
    ("Rigi: all official cameras", at("Rigi Kulm"), "https://www.rigi.ch/en/inform/webcams"),
    ("Rigi Kulm 360° panorama", at("Rigi Kulm"), "https://www.bergfex.com/rigi/webcams/c20527/"),
    ("Fronalpstock", at("Fronalpstock"), "https://www.feratel.com/en/webcams/switzerland/stoos-fronalpstock.html"),
    ("Stoos village", at("Stoos"), "https://www.feratel.com/en/webcams/switzerland/stoos.html"),
    ("Zugerberg and Zug cameras", at("Zugerberg"), "https://www.zug-tourismus.ch/en/webcams"),
    ("Hoch-Ybrig cameras", at("Hoch-Ybrig"), "https://www.bergfex.com/ybrig/webcams/"),
    ("Weissfluhjoch", at("Weissfluhjoch"), "https://www.feratel.com/en/webcams/switzerland/davos-dorf.html"),
    ("Bachtel tower", at("Bachtel"), "https://www.windfinder.com/webcams/bachtel-kulm"),
    ("Alp Scheidegg", at("Alp Scheidegg"), "https://www.windfinder.com/webcams/alp_scheidegg_wald"),
    ("Solothurn and Weissenstein cameras", at("Solothurn"), "https://www.solothurn-city.ch/en/information/webcams-weather"),
]
EXTRA = [(n, c[0], c[1], u) for n, c, u in _E]
