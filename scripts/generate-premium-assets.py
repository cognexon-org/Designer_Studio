from __future__ import annotations
import math, os, json
from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'realistic' / 'models'
ROOT.mkdir(parents=True, exist_ok=True)

COLORS = {
    'FABRIC_MAIN': [194, 179, 155, 255],
    'FABRIC_LIGHT': [232, 224, 210, 255],
    'FABRIC_ACCENT': [178, 104, 75, 255],
    'FABRIC_ACCENT2': [124, 147, 121, 255],
    'FABRIC_DARK': [66, 68, 72, 255],
    'WOOD': [160, 116, 72, 255],
    'WOOD_DARK': [82, 52, 35, 255],
    'METAL': [150, 150, 154, 255],
    'METAL_DARK': [50, 52, 56, 255],
    'GLASS': [190, 220, 230, 100],
    'MIRROR': [210, 220, 225, 255],
    'CERAMIC': [238, 238, 234, 255],
    'MARBLE': [222, 220, 213, 255],
    'GREEN': [75, 116, 62, 255],
    'TERRACOTTA': [169, 92, 62, 255],
    'EMISSIVE': [255, 226, 166, 255],
    'DARK': [42, 43, 46, 255],
}


def material_for(name: str):
    key = next((k for k in COLORS if k in name), 'WOOD')
    rgba = COLORS[key]
    base = [x / 255 for x in rgba]
    metallic = 0.75 if 'METAL' in key else 0.0
    rough = 0.28 if 'METAL' in key else (0.18 if 'MIRROR' in key else 0.65)
    mat = PBRMaterial(name=name, baseColorFactor=base, metallicFactor=metallic, roughnessFactor=rough)
    if 'EMISSIVE' in key:
        mat.emissiveFactor = [1.0, 0.78, 0.42]
    return mat


def chamfered_box(size, bevel=0.025):
    sx, sy, sz = [float(v) for v in size]
    hx, hy, hz = sx/2, sy/2, sz/2
    b = max(0.0, min(bevel, hx*0.45, hy*0.45, hz*0.45))
    if b <= 1e-6:
        return trimesh.creation.box(extents=[sx, sy, sz])
    pts = []
    for ax in (-1, 1):
        for ay in (-1, 1):
            for az in (-1, 1):
                pts.extend([
                    [ax*(hx-b), ay*hy, az*hz],
                    [ax*hx, ay*(hy-b), az*hz],
                    [ax*hx, ay*hy, az*(hz-b)],
                ])
    mesh = trimesh.convex.convex_hull(np.asarray(pts), qhull_options='QbB Pp')
    return mesh


def add(scene, mesh, name, center=(0,0,0), rotation=None, scale=None):
    mesh = mesh.copy()
    if scale is not None:
        mesh.apply_scale(scale)
    if rotation is not None:
        # rotation xyz in radians
        rx, ry, rz = rotation
        T = trimesh.transformations.euler_matrix(rx, ry, rz, axes='sxyz')
        mesh.apply_transform(T)
    mesh.apply_translation(center)
    mesh.visual.material = material_for(name)
    scene.add_geometry(mesh, node_name=name, geom_name=name)


def cyl(radius, height, sections=32):
    m = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    # trimesh cylinder is Z-up; rotate to Y-up
    m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1,0,0]))
    return m


def sphere(scale=(1,1,1), subdivisions=2):
    m = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
    m.apply_scale(scale)
    return m


def torus(major, minor, major_sections=32, minor_sections=12):
    m = trimesh.creation.torus(major_radius=major, minor_radius=minor, major_sections=major_sections, minor_sections=minor_sections)
    # torus lies around Z axis; rotate to horizontal around Y
    m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1,0,0]))
    return m


def export(scene, name):
    path = ROOT / f'{name}.glb'
    path.write_bytes(scene.export(file_type='glb'))
    return path


def sofa(detail='high', sectional=False):
    sec = {'high':32,'medium':20,'low':12}[detail]
    scene=trimesh.Scene()
    width = 2.85 if sectional else 2.24
    depth = 0.92
    # base and apron
    add(scene, chamfered_box([width,0.18,depth],0.045),'FABRIC_MAIN_base',(0,0.25,0))
    add(scene, chamfered_box([width-0.12,0.10,depth-0.12],0.025),'DARK_shadow_plinth',(0,0.12,0))
    seats=3 if not sectional else 3
    seat_w=(width-0.32)/seats
    for i in range(seats):
        x=-width/2+0.16+seat_w/2+i*seat_w
        add(scene,chamfered_box([seat_w-0.035,0.18,0.73],0.055),'FABRIC_LIGHT_seat_%d'%i,(x,0.45,0.01))
        add(scene,chamfered_box([seat_w-0.05,0.46,0.18],0.05),'FABRIC_MAIN_back_%d'%i,(x,0.78,-0.33),rotation=(-0.10,0,0))
    # arms
    for x,side in [(-width/2+0.07,'L'),(width/2-0.07,'R')]:
        add(scene,chamfered_box([0.14,0.60,0.82],0.05),f'FABRIC_MAIN_arm_{side}',(x,0.55,0.0))
    # legs
    for x in (-width/2+0.20,width/2-0.20):
        for z in (-0.34,0.34):
            add(scene,cyl(0.035,0.18,sec),'METAL_DARK_leg',(x,0.09,z),rotation=(0,0,0))
    # accent pillows
    add(scene,sphere((0.24,0.22,0.085),2 if detail!='low' else 1),'FABRIC_ACCENT_pillow_L',(-width*0.30,0.77,-0.18),rotation=(0.1,0.08,-0.12))
    add(scene,sphere((0.23,0.21,0.085),2 if detail!='low' else 1),'FABRIC_ACCENT2_pillow_R',(width*0.30,0.76,-0.18),rotation=(0.06,-0.10,0.10))
    if sectional:
        # chaise on right front, plus low ottoman continuation
        chaise_x=width/2-0.52
        add(scene,chamfered_box([0.92,0.18,1.15],0.055),'FABRIC_LIGHT_chaise',(chaise_x,0.45,0.48))
        add(scene,chamfered_box([0.92,0.18,0.34],0.045),'FABRIC_MAIN_chaise_base',(chaise_x,0.25,0.88))
    return scene


def bed(detail='high', king=False):
    sec={'high':32,'medium':20,'low':12}[detail]
    scene=trimesh.Scene(); w=1.90 if king else 1.63; d=2.10 if king else 2.0
    # timber frame/plinth
    add(scene,chamfered_box([w,0.18,d],0.03),'WOOD_DARK_frame',(0,0.16,0))
    for x in (-w/2+0.12,w/2-0.12):
        for z in (-d/2+0.12,d/2-0.12): add(scene,cyl(.035,.16,sec),'METAL_DARK_leg',(x,.08,z))
    # mattress and duvet
    add(scene,chamfered_box([w-0.10,0.22,d-0.16],0.07),'FABRIC_LIGHT_mattress',(0,0.38,0.02))
    add(scene,chamfered_box([w-0.15,0.11,d*0.73],0.05),'FABRIC_SAND_duvet',(0,0.55,0.21))
    add(scene,chamfered_box([w-0.22,0.07,0.30],0.035),'FABRIC_ACCENT_throw',(0,0.62,d*0.31))
    # headboard with vertical panels
    panel_count=5 if king else 4
    pw=(w+0.16)/panel_count
    for i in range(panel_count):
        x=-(w+0.16)/2+pw/2+i*pw
        add(scene,chamfered_box([pw-0.025,0.74,0.10],0.035),'FABRIC_MAIN_headboard_panel',(x,0.78,-d/2+0.035))
    # pillows
    for x in (-w*0.24,w*0.24):
        add(scene,sphere((w*0.20,0.13,0.28),2 if detail!='low' else 1),'FABRIC_LIGHT_pillow',(x,0.66,-d*0.31),rotation=(0.08,0,0))
    if detail=='high':
        # bolster cushions
        for x in (-w*0.19,w*0.19):
            add(scene,sphere((w*0.15,0.11,0.20),2),'FABRIC_ACCENT2_cushion',(x,0.78,-d*0.37),rotation=(-0.15,0,0))
    return scene


def lounge_chair(detail='high', accent=False, stool=False):
    sec={'high':32,'medium':20,'low':12}[detail]
    scene=trimesh.Scene()
    if stool:
        # premium bar stool
        add(scene,sphere((0.25,0.08,0.22),2 if detail!='low' else 1),'FABRIC_MAIN_seat',(0,0.78,0))
        add(scene,sphere((0.23,0.22,0.08),2 if detail!='low' else 1),'FABRIC_MAIN_back',(0,0.88,-0.15),rotation=(-0.18,0,0))
        for a in range(4):
            ang=math.pi/4+a*math.pi/2
            x,z=0.17*math.cos(ang),0.17*math.sin(ang)
            add(scene,cyl(.018,.72,sec),'METAL_DARK_leg',(x,.37,z),rotation=(0,0,0))
        add(scene,torus(.20,.012,sec,max(8,sec//2)),'METAL_footrest',(0,0.34,0))
        return scene
    w=.80 if accent else .78
    add(scene,chamfered_box([w,0.16,0.72],0.05),'FABRIC_MAIN_seat',(0,0.48,0.02))
    add(scene,sphere((w*.47,.30,.10),2 if detail!='low' else 1),'FABRIC_MAIN_back',(0,0.68,-0.30),rotation=(-.10,0,0))
    add(scene,sphere((w*.42,.08,.28),2 if detail!='low' else 1),'FABRIC_LIGHT_pad',(0,0.53,-.03))
    if accent:
        for x in (-w/2+.06,w/2-.06):
            add(scene,chamfered_box([.10,.34,.62],.035),'FABRIC_ACCENT_arm',(x,.63,-.01),rotation=(0,0,0))
    for x in (-w*.31,w*.31):
        for z in (-.25,.25):
            # slightly splayed legs
            add(scene,cyl(.025,.42,sec),'WOOD_DARK_leg',(x,.21,z),rotation=(0.05 if z>0 else -0.05,0,0.06 if x>0 else -0.06))
    return scene


def dining_table(detail='high', round_top=False, side=False):
    sec={'high':48,'medium':28,'low':16}[detail]
    scene=trimesh.Scene()
    if side:
        add(scene,cyl(.25,.06,sec),'MARBLE_top',(0,.55,0))
        add(scene,cyl(.055,.47,sec),'METAL_DARK_pedestal',(0,.29,0))
        add(scene,cyl(.19,.035,sec),'METAL_DARK_base',(0,.04,0))
        return scene
    if round_top:
        add(scene,cyl(.65,.075,sec),'WOOD_top',(0,.72,0))
        add(scene,cyl(.12,.62,sec),'WOOD_DARK_pedestal',(0,.39,0))
        add(scene,cyl(.33,.055,sec),'METAL_DARK_base',(0,.065,0))
        if detail=='high': add(scene,torus(.33,.018,sec,12),'METAL_brass_ring',(0,.10,0))
        return scene
    # rectangular premium table 1.8 x 0.95
    add(scene,chamfered_box([1.80,.095,.95],.045),'WOOD_top',(0,.71,0))
    # two sculptural trapezoid-ish legs using chamfered blocks
    for x in (-.58,.58):
        add(scene,chamfered_box([.18,.62,.62],.035),'WOOD_DARK_leg',(x,.36,0),rotation=(0,0,0.08 if x<0 else -0.08))
        add(scene,chamfered_box([.30,.055,.70],.02),'METAL_DARK_foot',(x,.045,0))
    return scene


def wardrobe(detail='high'):
    sec={'high':32,'medium':20,'low':12}[detail]
    scene=trimesh.Scene(); w=1.80; h=2.25; d=.62
    add(scene,chamfered_box([w,h,d],.025),'WOOD_body',(0,h/2,0))
    add(scene,chamfered_box([w+.03,.08,d+.03],.015),'WOOD_DARK_plinth',(0,.04,0))
    # recessed doors and vertical trims
    door_w=(w-.08)/4
    for i in range(4):
        x=-w/2+.04+door_w/2+i*door_w
        add(scene,chamfered_box([door_w-.015,h-.18,.035],.012),'WOOD_door_%d'%i,(x,h/2+.04,d/2+.02))
        if i in (1,2):
            add(scene,chamfered_box([.025,.42,.025],.008),'METAL_handle_%d'%i,(x + (-1 if i==1 else 1)*door_w*.34,h*.54,d/2+.055))
    # full-height mirror on second door
    add(scene,chamfered_box([door_w*.76,h*.72,.018],.008),'MIRROR_panel',(-w/2+.04+door_w*1.5,h*.54,d/2+.055))
    # top cornice / side trims
    add(scene,chamfered_box([w+.06,.055,d+.02],.015),'WOOD_DARK_cornice',(0,h-.03,0))
    for x in (-w/2+.025,w/2-.025): add(scene,chamfered_box([.05,h-.10,.05],.015),'WOOD_DARK_trim',(x,h/2,.31))
    return scene


def plant(detail='high'):
    scene=trimesh.Scene(); sec={'high':40,'medium':24,'low':16}[detail]
    # pot and soil
    add(scene,cyl(.30,.45,sec),'TERRACOTTA_pot',(0,.225,0),scale=[1.0,1.0,1.0])
    add(scene,cyl(.255,.025,sec),'DARK_soil',(0,.455,0))
    add(scene,cyl(.045,.95,max(12,sec//2)),'GREEN_stem',(0,.92,0),rotation=(0,0,.04))
    n={'high':22,'medium':14,'low':8}[detail]
    for i in range(n):
        t=i/max(1,n-1)
        y=.62+t*.94
        ang=i*2.399963229728653 # golden angle
        radial=.11 + .10*math.sin(t*math.pi)
        x,z=radial*math.cos(ang),radial*math.sin(ang)
        # flattened ellipsoid leaf; larger in lower-mid region
        leaf_len=.22 + .10*(1-abs(t-.55))
        leaf_w=.075 + .035*(1-abs(t-.55))
        leaf=sphere((leaf_w,.018,leaf_len),2 if detail=='high' else 1)
        add(scene,leaf,f'GREEN_leaf_{i}',(x,y,z),rotation=(0.35+0.25*math.sin(i),-ang,0.25*math.cos(i)))
    return scene


def pendant(detail='high'):
    sec={'high':48,'medium':28,'low':16}[detail]
    scene=trimesh.Scene()
    add(scene,cyl(.025,.70,max(12,sec//2)),'METAL_DARK_cord',(0,.76,0))
    add(scene,cyl(.11,.06,sec),'METAL_DARK_canopy',(0,1.12,0))
    # shade as a lightweight truncated cone/frustum
    ys=[-.14,.14]; radii=[.28,.13]; verts=[]; faces=[]
    for yi,(y,r) in enumerate(zip(ys,radii)):
        for i in range(sec):
            a=2*math.pi*i/sec; verts.append([r*math.cos(a),y,r*math.sin(a)])
    for i in range(sec):
        j=(i+1)%sec; a=i; b=j; c=sec+j; d=sec+i; faces += [[a,b,c],[a,c,d]]
    shade=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=True)
    add(scene,shade,'METAL_shade',(0,.34,0))
    add(scene,sphere((.075,.075,.075),2 if detail!='low' else 1),'EMISSIVE_bulb',(0,.25,0))
    return scene


def kitchen_island(detail='high'):
    sec={'high':32,'medium':20,'low':12}[detail]
    scene=trimesh.Scene(); w=1.80; h=.94; d=.90
    add(scene,chamfered_box([w,h-.08,d-.08],.025),'CABINET_body',(0,(h-.08)/2,0))
    add(scene,chamfered_box([w+.08,.055,d+.10],.025),'MARBLE_countertop',(0,h-.03,0))
    # four cabinet doors and handles on front
    for i in range(4):
        x=-w/2+.08+(w-.16)/8+i*(w-.16)/4
        add(scene,chamfered_box([(w-.20)/4-.02,.64,.025],.008),'CABINET_door_%d'%i,(x,.47,d/2-.025))
        add(scene,cyl(.008,.18,max(10,sec//2)),'METAL_handle_%d'%i,(x+.10,.57,d/2+.005),rotation=(0,0,math.pi/2))
    # open shelf niche on back
    add(scene,chamfered_box([w*.46,.04,d*.18],.01),'WOOD_DARK_shelf',(0,.40,-d/2+.08))
    # subtle toe kick
    add(scene,chamfered_box([w-.14,.10,d-.10],.015),'DARK_toekick',(0,.05,0))
    return scene


def freestanding_tub(detail='high'):
    sec={'high':48,'medium':28,'low':16}[detail]
    scene=trimesh.Scene(); w=1.70; d=.78; h=.62
    # make tub from rounded rails and endcaps, leaving a visible inner cavity
    # bottom basin
    add(scene,sphere((w*.45,.18,d*.40),2 if detail!='low' else 1),'CERAMIC_basin',(0,.25,0))
    # long rims
    for z in (-d/2+.055,d/2-.055):
        add(scene,chamfered_box([w-.26,.16,.11],.05),'CERAMIC_rim',(0,h-.10,z))
    # rounded end rims
    for x in (-w/2+.08,w/2-.08):
        add(scene,sphere((.12,.10,d*.38),2 if detail!='low' else 1),'CERAMIC_end',(x,h-.10,0))
    # inner dark/water surface for depth
    add(scene,sphere((w*.39,.03,d*.31),2 if detail!='low' else 1),'GLASS_water',(0,h-.17,0))
    # drain and overflow
    add(scene,cyl(.035,.01,sec),'METAL_drain',(w*.22,h-.12,0))
    return scene


def generate_all():
    specs=[]
    # improved existing
    builders={
      'sofa': lambda d: sofa(d,False),
      'bed_queen': lambda d: bed(d,False),
      'chair': lambda d: lounge_chair(d,False,False),
      'dining_table': lambda d: dining_table(d,False,False),
      'wardrobe': wardrobe,
      'plant': plant,
    }
    # new premium
    builders.update({
      'sectional_sofa': lambda d: sofa(d,True),
      'accent_chair': lambda d: lounge_chair(d,True,False),
      'bar_stool': lambda d: lounge_chair(d,False,True),
      'king_bed': lambda d: bed(d,True),
      'round_dining_table': lambda d: dining_table(d,True,False),
      'side_table': lambda d: dining_table(d,False,True),
      'pendant_light': pendant,
      'kitchen_island': kitchen_island,
      'freestanding_tub': freestanding_tub,
    })
    for name,builder in builders.items():
        for detail in ('high','medium','low'):
            scene=builder(detail)
            target=name if detail=='high' else f'{name}_{detail}'
            path=export(scene,target)
            loaded=trimesh.load(path, force='scene')
            tri=sum(len(g.faces) for g in loaded.geometry.values())
            specs.append({'id':target,'file':path.name,'bytes':path.stat().st_size,'triangles':tri,'bounds':loaded.extents.tolist()})
            print(f'{target:28} {path.stat().st_size:8d} bytes {tri:6d} tris ext={loaded.extents}')
    (ROOT.parent/'PREMIUM_ASSET_BUILD.json').write_text(json.dumps({'generatedBy':'Patch 03A procedural asset builder','assets':specs},indent=2))

if __name__=='__main__':
    generate_all()
