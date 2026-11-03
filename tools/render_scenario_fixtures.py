"""Genera diagramas PNG controlados desde el catálogo; no es un modelo de visión.

Dependencia opcional de autoría: Pillow. Los PNG y sus hashes quedan en Git;
las pruebas y el consumo del catálogo no requieren instalar Pillow.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'docs/fixtures/scenarios/catalog.json'
COLORS = {'person':'#334d69','helmet':'#e9b949','vest':'#21a79a','forklift':'#dd9a38',
          'box':'#a6754c','pallet':'#7b6651','product':'#6fa5bd','surface-defect':'#c33149','shelf':'#64748b'}

def font(size):
    try:
        return ImageFont.truetype('DejaVuSans.ttf', size)
    except OSError:
        return ImageFont.load_default()

def bounds(box):
    return tuple(round(v) for v in (box['x']*800, box['y']*600,
                                    (box['x']+box['width'])*800, (box['y']+box['height'])*600))

def draw_case(scenario, case):
    image = Image.new('RGB', (800, 600), '#f1f5f9')
    draw = ImageDraw.Draw(image)
    draw.rectangle((0,0,799,62), fill='#123047')
    draw.text((20,13), scenario['name'], fill='white', font=font(23))
    draw.text((20,43), 'DEMO | Diagrama de referencia preparado', fill='#8ce2e2', font=font(12))
    if 'zone' in scenario:
        draw.rectangle(bounds(scenario['zone']['bounds']), fill='#d7efeb', outline='#0e8a80', width=3)
    # Draw the person silhouette within its exact bounding rectangle.
    for item in sorted(case['objects'], key=lambda obj: 0 if obj['classId']=='person' else 1):
        x1,y1,x2,y2=bounds(item['box']);w=x2-x1;hh=y2-y1;cls=item['classId'];color=COLORS[cls]
        if cls=='person':
            draw.ellipse((x1+w*.3,y1,x1+w*.7,y1+hh*.2),fill=color)
            draw.polygon([(x1+w*.2,y1+hh*.23),(x2-w*.2,y1+hh*.23),(x2,y1+hh*.65),(x2-w*.25,y1+hh*.65),(x2-w*.25,y2),(x1+w*.55,y2),(x1+w*.5,y1+hh*.72),(x1+w*.45,y2),(x1+w*.25,y2),(x1+w*.25,y1+hh*.65),(x1,y1+hh*.65)],fill=color)
        elif cls=='helmet':
            draw.pieslice((x1,y1,x2,y2+(y2-y1)),180,360,fill=color)
            draw.rectangle((x1,y1+(y2-y1)*.8,x2,y2),fill=color)
        elif cls=='forklift':
            draw.rectangle((x1,y1+hh*.15,x1+w*.7,y1+hh*.75),fill=color)
            draw.rectangle((x1+w*.65,y1,x1+w*.75,y1+hh*.8),fill='#475569')
            draw.rectangle((x1+w*.7,y1+hh*.7,x2,y1+hh*.78),fill='#475569')
            for cx in (x1+w*.2,x1+w*.6):draw.ellipse((cx-w*.1,y2-hh*.2,cx+w*.1,y2),fill='#233443')
        elif cls=='surface-defect':
            draw.polygon([(round(x*800),round(y*600)) for x,y in item['polygon']],fill=color)
        else:
            draw.rounded_rectangle((x1,y1,x2,y2),radius=3,fill=color,outline='#334155',width=1)
        # Exact bounding box is supplied separately in JSON; diagrams are inputs, not inferred overlays.
    if 'occludedRegion' in case['observations']:
        rect=bounds(case['observations']['occludedRegion'])
        draw.rectangle(rect,fill='#c6cbd1')
        draw.text((rect[0]+3,rect[1]+4),'NO VISIBLE',font=font(10),fill='#475569')
    draw.rectangle((0,552,799,599),fill='white')
    label={'positive':'Positivo: activa la regla','negative':'Negativo: no activa la regla','ambiguous':'Ambiguo: requiere revisión'}[case['kind']]
    draw.text((18,560),label,font=font(17),fill='#123047')
    draw.text((18,583),case['id']+' | Sin inferencia de IA',font=font(11),fill='#64748b')
    path=ROOT/case['asset']['path'];path.parent.mkdir(parents=True,exist_ok=True)
    image.save(path,format='PNG',optimize=True)
    case['asset']['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    catalog=json.loads(CATALOG.read_text())
    for scenario in catalog['scenarios']:
        for case in scenario['cases']:draw_case(scenario,case)
    CATALOG.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print('12 diagramas PNG creados y vinculados a su huella SHA-256.')

if __name__=='__main__':main()
