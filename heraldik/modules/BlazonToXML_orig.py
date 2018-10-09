#! /usr/bin/python3

import regex as re
import sys
import xml.etree.ElementTree as et
import xml.dom.minidom


COLORS_LIST = [
    "silber",
    "gold",
    "schwarz",
    "blau",
    "rot",
    "grün",
    ]
COLORS = "|".join(COLORS_LIST)

COLORS_ADJ = {
    "silbern" : "silber",
    "silberbekleidet" : "silber",
    "golden" : "gold",
    "goldbekleidet" : "gold",
    "schwarz" : "schwarz",
    "schwarzbekleidet" : "schwarz",
    "blau" : "blau",
    "blaubekleidet" : "blau",
    "rot" : "rot",
    "rotbekleidet" : "rot",
    "grün" : "grün",
    "grünbekleidet" : "grün",
    "naturfarben" : "natur",
    "" : "natur",
    "verwechselt" : "verwechselt",
    }
COLORS_ADJ_OPTIONS = "|".join([key for key, value in COLORS_ADJ.items()])
    
SEPARATIONS_1 = [
    "geteilt",
    "gespalten",
    "schräggeteilt",
    "erniedrigt schräggeteilt",
    "überdeckt schräggeteilt",
    "schräglinksgeteilt",
    ]
SEPARATIONS_1 = "|".join(SEPARATIONS_1)

SEPARATIONS_2 = [
    "geviert",
    "pfahlweise rechtsgerautet",
    ]
SEPARATIONS_2 = "|".join(SEPARATIONS_2)

FORMATION_OPTIONS = [
    "balkenweise",
    "pfahlweise",
    "schrägbalkenweise",
    "schräglinksbalkenweise",
    ]
FORMATION_OPTIONS = "|".join(FORMATION_OPTIONS)
    
## FELD_IDENTIFIKATION
# In [Farbe] [Figuren]
felder_1_ledig_1 = "in (?P<Farbe>{0}) (?P<Figur>.*?)(?P<Überdeckt>, überdeckt von .*?)?$".format(COLORS)
# ledig [Farbe]
felder_1_ledig_2 = "ledig ({0})".format(COLORS)
# In [Farbe1]-[Farbe2] [Teilung] Feld [Figur]
felder_2_ledig_3 = "in (?P<Farbe1>{0})-(?P<Farbe2>{0}) (?P<Teilung>{1})em Feld (?P<Figur>.*?)$".format(COLORS, SEPARATIONS_1)
# [Farbe1]-[Farbe2] [Teilung]
felder_2_ledig_1 = "({0})-({1}) ({2})".format(COLORS, COLORS, SEPARATIONS_1)
# [Teilung]: oben/rechts/vorne [feld], unten/links/hinten [feld]
felder_2_ledig_2 = "(?P<Teilung>{0}): (oben|rechts|vorne) (?P<Feld1>.*?), (unten|links|hinten) (?P<Feld2>.*?)$".format(SEPARATIONS_1)
# [Anzahl]mal [Farbe1]-[Farbe2] [Teilung]
felder_X_1 = "(?P<Anzahl>[1-9])mal (?P<Farbe1>{0})-(?P<Farbe2>{1}) (?P<Teilung>{2})(?P<Überdeckt>(,| und) überdeckt von .*?)?$".format(COLORS, COLORS, SEPARATIONS_1)
# [Farbe1]-[Farbe2] geviert
felder_4_1 = "(?P<Farbe1>{0})-(?P<Farbe2>{1}) (?P<Teilung>{2})".format(COLORS, COLORS, SEPARATIONS_2)

## BORD IDENTIFIKATION
# innerhalb 1 [Belegt]? [Farbe] Schildbords, [Feld]
bord_1 = "innerhalb 1(?P<Belegt> mit .*? belegten)? (?<Farbe>{0})en Schildbords, (?P<Feld>.*?)$".format(COLORS_ADJ_OPTIONS)

## HAUPT IDENTIFIKATION
# unter 1 [Belegt]? [Farbe] Schildhaupt, [darin [Figuren],]?, [Feld]
haupt_1 = "unter 1(?P<Belegt> mit .*? belegten)? (?<Farbe>{0})en Schildhaupt(, darin (?P<Figur>.*?))?,? (?P<Feld>.*?)$".format(COLORS_ADJ_OPTIONS)

## FIGUR_IDENTIFIKATION
sub_figur_pattern = "(\
(?P<ObenUnten> (der|die|das) (obere(n)?|rechte(n)?) (belegt|besetzt|bewinkelt|begleitet|überdeckt) (von|mit)( je)? \d, (der|die|das) (untere(n)?|linke(n)?) (mit|von) .*?)|\
(?P<Besetzt>.*? besetzt mit .*?)|\
(?P<Spezial2>.*?haltend(, dies(es|e|er) .*?)?)|\
(?P<Belegt>.*? belegt mit( je)? .*?)|\
(?P<Bewinkelt> bewinkelt von .*?)|(?P<Umschliesst>.*? umschliessend)|\
(?P<Begleitet>.*? begleitet von( je)? .*?)|\
(?P<ÜberdecktSingle> überdeckt von .*)\
)"

sub_figur_pattern2 = "(\
(?P<ObenUnten2> (der|die|das) (obere(n)?|rechte(n)?) (belegt|besetzt|bewinkelt|begleitet|überdeckt) (von|mit)( je)? \d, (der|die|das) (untere(n)?|linke(n)?) (mit|von) .*?)|\
(?P<Besetzt2>.*? besetzt mit .*?)|(?P<Spezial3>.*?haltend(, dies(es|e|er) .*?)?)|\
(?P<Belegt3>.*? belegt mit .*?)|\
(?P<Bewinkelt2> bewinkelt von .*?)|(?P<Umschliesst2>.*? umschliessend)|(?P<Begleitet2>.*?begleitet von( je)? .*?)|\
(?P<ÜberdecktSingle2> überdeckt von .*)\
)"

# [Anzahl] [Spezial]? [Farbe] [Figur] [Position]? [,]? [Spezial2]? und viel mehr
figur_pattern = "(?P<Anzahl>[1-9])(?P<FormationSingle2> (\d:)+\d gestellt(en|e|er))?(?P<Spezial>.*?)(?P<Belegt2> mit .*? belegt(e|es|er|en))? ((?P<Farbe>{0})(er|e|es|en) )?\
((?P<Spezial4>[a-z]\w+)(es|e|er|en) )?(?P<Figur>[A-Z]\w+)\
(?P<BuchstabenSpezifikation> (\w, )*?\w( und \w)?)?\
(?P<VerwechselteTinkturen> in verwechselte(n|r) Tinktur(en)?)?\
(?P<Spezial5> mit .*?)?\
(?P<Position> an (der|die|das) \S+)?\
(?P<FormationSingle> ({1}))?(,( dies(es|e|er))?{2}( und{3})?)?$".format(COLORS_ADJ_OPTIONS, FORMATION_OPTIONS, sub_figur_pattern, sub_figur_pattern2, FORMATION_OPTIONS)

# Multiple Groups
fgroups_pattern = "((?P<Figur3>{2}, )?(?P<Figur2>{1} und ))?(?P<BasisFigur>{0})(?P<Formation>, ({3}|(\d:)+\d gestellt))?$".format(figur_pattern[:-1], figur_pattern[:-1], figur_pattern[:-1], FORMATION_OPTIONS)

# Für Figuren ohne Anzahl
uncountable_pattern = "(?P<FormationSingle2>(\d:)+\d gestellt(en|e|er))?(?P<Spezial>.*?)(?P<Belegt2>mit .*? belegt(e|es|er|en))?((?P<Farbe>{0})(er|e|es|en) )?\
((?P<Spezial4>[a-z]\w+)(es|e|er|en) )?\
(?P<Figur>[A-Z]\w+)\
(?P<BuchstabenSpezifikation> (\w, )*?\w( und \w)?)?\
(?P<VerwechselteTinkturen> in verwechselte(n|r) Tinktur(en)?)?\
(?P<Spezial5> mit .*?)?\
(?P<Position> an (der|die|das) \S+)?\
(?P<FormationSingle> ({1}))?(,( dies(es|e|er))?{2}( und{3})?)?$".format(COLORS_ADJ_OPTIONS, FORMATION_OPTIONS, sub_figur_pattern, sub_figur_pattern2, FORMATION_OPTIONS)


def convert(line):
    
    tree = et.Element("Schild")
    
    field = line.strip()
    
    # truecase
    field = field[0].lower() + field[1:]
    to_lowercase_indices = []
    for n, char in enumerate(field):
        if char == ":":
            to_lowercase_indices.append(n+2)
    for index in to_lowercase_indices:
        field = field[:index] + field[index].lower() + field[index+1:]
    field = " ".join([word.lower() if word.lower() in COLORS_LIST else word for word in field.split()])
    
    field = field.rstrip(".")
    
    analyze_field(tree, field)
    
    #~ for elem in tree.iter():
        #~ print(elem, elem.attrib)
    
    return xml.dom.minidom.parseString(et.tostring(tree).decode("utf8")).toprettyxml()
    
    
def add_ledig_Feld(field, color):
    feld = et.SubElement(field, "Feld", layout="ledig")
    et.SubElement(feld, "Farbe", value=color)
    
    
def analyze_field(parent, field):
    
    # Überprüfen auf Teilung
    if re.match(bord_1, field):
        match = re.match(bord_1, field)
        color = match.group("Farbe")
        feld = match.group("Feld")
        belegt = match.group("Belegt")
        bord = et.SubElement(parent, "Bord", layout="ledig")
        et.SubElement(bord, "Farbe", value=COLORS_ADJ[color])
        if belegt:
            add_belegt(bord, belegt)
        analyze_field(parent, feld)
    elif re.match(haupt_1, field):
        match = re.match(haupt_1, field)
        color = match.group("Farbe")
        content = match.group("Figur")
        feld = match.group("Feld")
        belegt = match.group("Belegt")
        head = et.SubElement(parent, "Haupt", design="", layout="ledig")
        et.SubElement(head, "Farbe", value=COLORS_ADJ[color])
        if belegt:
            add_belegt(head, belegt)
        if content:
            analyze_figure(head, content)
        analyze_field(parent, feld)
    elif re.match(felder_2_ledig_1, field):
        match = re.match(felder_2_ledig_1, field)
        color1 = match.group(1)
        color2 = match.group(2)
        sep = match.group(3)
        feld = et.SubElement(parent, "Feld", layout=sep)
        male = et.SubElement(feld, "Male", value="1")
        add_ledig_Feld(feld, color1)
        add_ledig_Feld(feld, color2)
    elif re.match(felder_1_ledig_1, field):
        match = re.match(felder_1_ledig_1, field)
        color = match.group("Farbe")
        figur = match.group("Figur")
        cover = match.group("Überdeckt")
        new_field = et.SubElement(parent, "Feld", layout="ledig")
        et.SubElement(new_field, "Farbe", value=COLORS_ADJ[color])
        analyze_figure(new_field, figur)
        if cover:
            add_cover(new_field, cover)
    elif re.match(felder_2_ledig_2, field):
        match = re.match(felder_2_ledig_2, field)
        sep = match.group("Teilung")
        feld1 = match.group("Feld1")
        feld2 = match.group("Feld2")
        #~ covering = match.group("Überdeckt")
        new_field = et.SubElement(parent, "Feld", layout=sep)
        analyze_field(new_field, feld1)
        analyze_field(new_field, feld2)
        #~ if covering:
            #~ add_cover(new_field, covering)
    elif re.match(felder_2_ledig_3, field):
        match = re.match(felder_2_ledig_3, field)
        sep = match.group("Teilung")
        color1 = match.group("Farbe1")
        color2 = match.group("Farbe2")
        figur = match.group("Figur")
        new_field = et.SubElement(parent, "Feld", layout=sep)
        add_ledig_Feld(new_field, color1)
        add_ledig_Feld(new_field, color2)
        analyze_figure(new_field, figur)
    elif re.match(felder_1_ledig_2, field):
        match = re.match(felder_1_ledig_2, field)
        color = match.group(1)
        new_field = et.SubElement(parent, "Feld", layout="ledig")
        et.SubElement(new_field, "Farbe", value=COLORS_ADJ[color])
    elif re.match(felder_X_1, field):
        match = re.match(felder_X_1, field)
        color1 = match.group("Farbe1")
        color2 = match.group("Farbe2")
        sep = match.group("Teilung")
        number = match.group("Anzahl")
        covering = match.group("Überdeckt")
        new_field = et.SubElement(parent, "Feld", layout=sep)
        et.SubElement(new_field, "Male", value=number)
        add_ledig_Feld(new_field, color1)
        add_ledig_Feld(new_field, color2)
        if covering:
            add_cover(new_field, covering)
    elif re.match(felder_4_1, field):
        match = re.match(felder_4_1, field)
        sep = match.group("Teilung")
        color1 = match.group("Farbe1")
        color2 = match.group("Farbe2")
        new_field = et.SubElement(parent, "Feld", layout=sep)
        add_ledig_Feld(new_field, color1)
        add_ledig_Feld(new_field, color2)
        add_ledig_Feld(new_field, color1)
        add_ledig_Feld(new_field, color2)
    else:
        print("FIELD INFO COULDNT BE READ!")
        print(field)
    
    # Überprüfen auf Figuren
    # Überprüfen auf weitere
    

def analyze_figure(parent, figur, je=False, customNum=None):
    
    #~ print(figur)
    
    # before analyzing single figures, find out how many fgroups are in there
    match = re.match(fgroups_pattern, figur)
    if match:
        basic = match.group("BasisFigur")
        figur2 = match.group("Figur2")
        figur3 = match.group("Figur3")
        formation = match.group("Formation")
        #~ print(basic)
        #~ print(figur2)
        #~ print(figur3)
        #~ print(formation)
        if formation:
            formation = match.group("Formation").lstrip(", ")
        else:
            formation = ""
        if basic and figur2 and figur3:
            fgroup = et.SubElement(parent, "FGruppe", formation=formation, orientation="")
            analyze_single_figure(fgroup, figur3.rstrip(", "), je, customNum)
            analyze_single_figure(fgroup, re.sub(" und $", "", figur2), je, customNum)
            analyze_single_figure(fgroup, basic, je, customNum)
        elif basic and figur2:
            fgroup = et.SubElement(parent, "FGruppe", formation=formation, orientation="")
            analyze_single_figure(fgroup, re.sub(" und $", "", figur2), je, customNum)
            analyze_single_figure(fgroup, basic, je, customNum)
        elif basic:
            analyze_single_figure(parent, basic, je, customNum, formation)
        else:
            print("MULTIFIGURES ERROR")
    else:
        print("MULTIFIGURES COULDNT BE READ!")
        print(figur)
        

def analyze_single_figure(parent, figur, je, customNum, customFormation=None):
    
    #~ print(figur)

    match = re.match(figur_pattern, figur)
    if match:
        process_figure(match, parent, figur, je, customNum, customFormation)
    elif re.match(uncountable_pattern, figur):
        match = re.match(uncountable_pattern, figur)
        process_figure(match, parent, figur, je, 1, customFormation)
    else:
        print("FIGURE INFO COULDNT BE READ!")
        print(figur)
        

def process_figure(match, parent, figur, je, customNum, customFormation):
    if customNum:
        number = customNum
    else:
        number = int(match.group("Anzahl"))
        if je:
            number *= 2
    color = match.group("Farbe")
    if not color:
        color = ""
    verwechselt = match.group("VerwechselteTinkturen")
    if verwechselt:
        color = "verwechselt"
    specials = []
    if match.group("Spezial") and len(match.group("Spezial")) > 0:
        special1 = match.group("Spezial").strip()
        specials.append(special1)
    if match.group("Spezial2") and len(match.group("Spezial2")) > 0:
        special2 = match.group("Spezial2").strip()
        specials.append(special2)
    if match.group("Spezial3") and len(match.group("Spezial3")) > 0:
        special3 = match.group("Spezial3").strip()
        specials.append(special3)
    if match.group("Spezial4") and len(match.group("Spezial4")) > 0:
        special4 = match.group("Spezial4").strip()
        specials.append(special4)
    if match.group("Spezial5") and len(match.group("Spezial5")) > 0:
        special5 = match.group("Spezial5").strip()
        specials.append(special5)
    special = ", ".join(specials)
    if match.group("Position") and len(match.group("Position")) > 0:
        orientation = match.group("Position").strip()
    else:
        orientation = ""
    figure = match.group("Figur")
    besetzt = match.group("Besetzt")
    besetzt2 = match.group("Besetzt2")
    belegt = match.group("Belegt")
    belegt2 = match.group("Belegt2")
    belegt3 = match.group("Belegt3")
    bewinkelt = match.group("Bewinkelt")
    bewinkelt2 = match.group("Bewinkelt2")
    umschliesst = match.group("Umschliesst")
    umschliesst2 = match.group("Umschliesst2")
    begleitet = match.group("Begleitet")
    begleitet2 = match.group("Begleitet2")
    ueberdeckt = match.group("ÜberdecktSingle")
    ueberdeckt2 = match.group("ÜberdecktSingle2")
    letterSpecial = match.group("BuchstabenSpezifikation")
    formation = match.group("FormationSingle")
    formation2 = match.group("FormationSingle2")
    updown = match.group("ObenUnten")
    updown2 = match.group("ObenUnten2")
    formations = [x.strip() for x in [formation, formation2, customFormation] if x != None and x != ""]
    formation = ", ".join(formations)
    if letterSpecial:
        letterSpecial = re.sub(",", "", letterSpecial)
        letterSpecial = re.sub("und ", "", letterSpecial)
        letterSpecial = letterSpecial.split()
        if len(letterSpecial) != int(number):
            print("NUM OF LETTERS NOT MATCHING COUNT")
            letterSpecial = None
    fgroup = et.SubElement(parent, "FGruppe", formation=formation, orientation="")
    for i in range(int(number)):
        figure_element = et.SubElement(fgroup, "Figur", color=COLORS_ADJ[color], special=special, figure=figure, orientation=orientation)
        if besetzt:
            add_besetzt(figure_element, besetzt)
        if besetzt2:
            add_besetzt(figure_element, besetzt2)
        if belegt:
            add_belegt(figure_element, belegt)
        if belegt2:
            add_belegt(figure_element, belegt2)
        if belegt3:
            add_belegt(figure_element, belegt3)
        if bewinkelt:
            add_bewinkelt(figure_element, bewinkelt)
        if bewinkelt2:
            add_bewinkelt(figure_element, bewinkelt2)
        if umschliesst:
            add_umschliesst(figure_element, umschliesst)
        if umschliesst2:
            add_umschliesst(figure_element, umschliesst2)
        if begleitet:
            add_begleitet(figure_element, begleitet)
        if begleitet2:
            add_begleitet(figure_element, begleitet2)
        if letterSpecial:
            if len(figure_element.get("special")) > 0:
                figure_element.set("special", letterSpecial[i] + ", " + figure_element.get("special"))
            else:
                figure_element.set("special", letterSpecial[i])
    if ueberdeckt:
        add_cover(fgroup, ueberdeckt)
    if ueberdeckt2:
        add_cover(fgroup, ueberdeckt2)
    # prepare updown so they go the right elements
    if updown:
        updown_list = prepare_updown(fgroup, updown)
    if updown2:
        updown_list2 = prepare_updown(fgroup, updown2)
        
        
def prepare_updown(fgroup, content):
    """
    In: FGruppe-Element which contains Figur-Elements
    In: String with Info
    Out: etree-Element to add to a figure
    """
    #~ print(content)
    match = re.match(" (der|die|das) (obere(?P<Plural1>n)?|rechte(?P<Plural1>n)?) (?P<Category>(belegt|besetzt|bewinkelt|begleitet|überdeckt)) (von|mit)(?P<Je> je)? (?P<CustomNum>\d), (der|die|das) (untere(?P<Plural2>n)?|linke(?P<Plural2>n)?) (mit|von)(?P<Je> je)? (?P<Figur>.*?)$", content)
    if match:
        plural1 = match.group("Plural1")
        plural2 = match.group("Plural2")
        customNum = match.group("CustomNum")
        category = match.group("Category")
        figur = match.group("Figur")
        #~ je = match.group("Je")
        # das je hier bewirkt keine Verdopplung, es ist nur ein weiterer Hinweis, welche Seite plural ist
        je = False
        if plural1 and plural2:
            print("WHAT IS THIS MADNESS")
            return
        elif plural1:
            # oben/rechts mehrere
            uppers = fgroup[:-1]
            lower = fgroup[-1]
            for f in uppers:
                new_elem = et.SubElement(f, category.title(), orientation="")
                analyze_figure(new_elem, figur, je, customNum)
            new_elem = et.SubElement(lower, category.title(), orientation="")
            analyze_figure(new_elem, figur, je)
        elif plural2:
            # unten/links mehrere
            upper = fgroup[0]
            lowers = fgroup[1:]
            for f in lowers:
                new_elem = et.SubElement(f, category.title(), orientation="")
                analyze_figure(new_elem, figur, je)
            new_elem = et.SubElement(upper, category.title(), orientation="")
            analyze_figure(new_elem, figur, je, customNum)
        else:
            if len(fgroup) > 2:
                print("MORE ELEMENTS THAN MAKE SENSE")
                return
            # Nur 2 Element, oben und unten
            upper = fgroup[0]
            lower = fgroup[1]
            new_elem = et.SubElement(upper, category.title(), orientation="")
            analyze_figure(new_elem, figur, je, customNum)
            new_elem2 = et.SubElement(lower, category.title(), orientation="")
            analyze_figure(new_elem2, figur, je)
    else:
        print("UPDOWN INFO COULDNT BE READ!")
        print(content)  
        
        
def add_begleitet(parent, content):
    match = re.match("(?P<Orientierung>.*?) begleitet von(?P<Je> je)? (?P<Figur>.*?)$", content)
    if match:
        orientation = match.group("Orientierung")
        if orientation:
            orientation = orientation.strip()
        # if "je" is present, add double the number of elements
        if match.group("Je"):
            je = True
        else:
            je = False
        begleitet_element = et.SubElement(parent, "Begleitet", orientation=orientation)
        analyze_figure(begleitet_element, match.group("Figur").strip(), je)
    else:
        print("BEGLEITET INFO COULDNT BE READ!")
        print(content)        
        
        
def add_umschliesst(parent, content):
    content = content
    match = re.match("(?P<Figur>.*?)(?P<Position>( in .*?)?) umschliessend?$", content)
    if match:
        orientation = match.group("Position")
        if orientation:
            orientation = orientation.strip()
        bewinkelt_element = et.SubElement(parent, "Umschliesst", orientation=orientation)
        analyze_figure(bewinkelt_element, match.group("Figur").strip())
    else:
        print("UMSCHLIESST INFO COULDNT BE READ!")
        print(content)

        
def add_bewinkelt(parent, content):
    content = content.strip()
    match = re.match("bewinkelt von (?P<Figur>.*?)$", content)
    if match:
        bewinkelt_element = et.SubElement(parent, "Bewinkelt", orientation="")
        analyze_figure(bewinkelt_element, match.group("Figur"))
    else:
        print("BEWINKELT INFO COULDNT BE READ!")
        print(content)
        
def add_belegt(parent, content):
    content = content
    match = re.match("(?P<Orientierung>.*?) belegt mit( je)? (?P<Figur>.*?)$", content)
    match2 = re.match(" mit( je)? (?P<Figur>.*?) belegt(er|en|e|es)$", content)
    if match:
        orientation = match.group("Orientierung")
        if orientation:
            orientation = orientation.strip()
        belegt_element = et.SubElement(parent, "Belegt", orientation=orientation)
        analyze_single_figure(belegt_element, match.group("Figur"), False, False)
    elif match2:
        belegt_element = et.SubElement(parent, "Belegt", orientation="")
        analyze_single_figure(belegt_element, match2.group("Figur"), False, False)
    else:
        print("BELEGT INFO COULDNT BE READ!")
        print(content)
        
        
def add_besetzt(parent, content):
    content = content
    match = re.match("(?P<Orientierung>.*?) besetzt mit (?P<Figur>.*?)$", content)
    if match:
        orientation = match.group("Orientierung")
        if orientation:
            orientation = orientation.strip()
        besetzt_element = et.SubElement(parent, "Besetzt", orientation=orientation)
        analyze_single_figure(besetzt_element, match.group("Figur"), False, False)
    else:
        print("BESETZT INFO COULDNT BE READ!")
        print(content)
        

def add_cover(parent, figur):
    figur = re.sub(" und überdeckt von ", "", figur)
    figur = re.sub(", überdeckt von ", "", figur)
    figur = re.sub(" überdeckt von ", "", figur)
    cover_element = et.SubElement(parent, "Ueberdeckt", orientation="")
    analyze_figure(cover_element, figur)
    

def main():
    input_file = sys.argv[1]
    
    for line in open(input_file):
        xml_string = convert(line)
        print(xml_string)


if __name__ == "__main__":
    main()
