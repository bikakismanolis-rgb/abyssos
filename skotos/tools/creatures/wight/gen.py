# Headless MPFB2 generator for the wight / barrow lord (CC0 MakeHuman assets, game_engine rig = UE bone names).
# usage (cwd = research/tooling): BLENDER_USER_RESOURCES=$PWD/blender_user venv/bin/python <this> cfg.json
# cfg: name, out, macro, targets, skin (abs path .mhmat), assets [[abs path .mhclo, type]], eyes (abs path),
#      decimate {substr: tris}, tatter {substr: {...}}, push {substr: metres}, height (target metres), blend
import bpy, sys, os, json, time, importlib, math, random
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

T0 = time.time()
cfg = json.load(open(sys.argv[-1]))
import addon_utils
addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)

def dyn(pkg, key):
    for amod in list(sys.modules):
        if amod.endswith(pkg):
            return getattr(importlib.import_module(amod), key)
    raise ValueError(pkg)

HumanService = dyn("mpfb.services.humanservice", "HumanService")
ExportService = dyn("mpfb.services.exportservice", "ExportService")
ObjectService = dyn("mpfb.services.objectservice", "ObjectService")
TargetService = dyn("mpfb.services.targetservice", "TargetService")

bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)

macro = TargetService.get_default_macro_info_dict()
for k, v in cfg.get("macro", {}).items():
    if k in ("african", "asian", "caucasian"):
        macro["race"][k] = v
    else:
        macro[k] = v
basemesh = HumanService.create_human(macro_detail_dict=macro)
tdir = cfg["targets_dir"]
for tname, w in cfg.get("targets", {}).items():
    TargetService.load_target(basemesh, os.path.join(tdir, tname + ".target.gz"), weight=w)
print("created human", round(time.time() - T0, 1), flush=True)

HumanService.set_character_skin(cfg["skin"], basemesh, skin_type="GAMEENGINE")
HumanService.add_builtin_rig(basemesh, "game_engine")
print("rig added", round(time.time() - T0, 1), flush=True)

for path, atype in cfg.get("assets", []):
    assert os.path.exists(path), path
    HumanService.add_mhclo_asset(path, basemesh, asset_type=atype, subdiv_levels=0, material_type="GAMEENGINE")
    print("added", os.path.basename(path), round(time.time() - T0, 1), flush=True)

export_root = ExportService.create_character_copy(basemesh, name_suffix="_export")
export_basemesh = ObjectService.find_object_of_type_amongst_nearest_relatives(export_root, "Basemesh")
ExportService.bake_modifiers_remove_helpers(export_basemesh, bake_masks=True, bake_subdiv=True, remove_helpers=True, also_proxy=True)
keep = {export_root} | set(ObjectService.get_list_of_children(export_root))
for o in list(bpy.data.objects):
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
print("baked", round(time.time() - T0, 1), flush=True)

def mesh_objs():
    return [o for o in bpy.data.objects if o.type == 'MESH']
def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)
for o in mesh_objs():
    if o.data.shape_keys:
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
for o in bpy.data.objects:
    print("OBJ", o.name, o.type, ObjectService.get_object_type(o), tris(o) if o.type == 'MESH' else '', [m.type for m in o.modifiers] if o.type == 'MESH' else '', flush=True)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for a, b in {"head": "Head"}.items():
    if a in arm.data.bones:
        arm.data.bones[a].name = b

def find(sub):
    return [o for o in mesh_objs() if sub in o.name.lower()]

# --- explicit body region removal by vertex group (e.g. feet inside boots) ---
body = [o for o in mesh_objs() if ObjectService.get_object_type(o) in ("Basemesh", "Proxymeshes")]
for o in body:
    for vg in cfg.get("drop_body_groups", []):
        g = o.vertex_groups.get(vg)
        if not g: print("no group", vg); continue
        bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
        dl = bm.verts.layers.deform.active
        kill = [v for v in bm.verts if dl and g.index in v[dl] and v[dl][g.index] > 0.5]
        bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(o.data); bm.free()
        print("dropped group", vg, len(kill))

# --- tatter: cut ragged strips into hems (world rest-pose coordinates, z up) ---
def hashf(i, s=0):
    x = math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return x - math.floor(x)
for key, tc in cfg.get("tatter", []):
    for o in find(key):
        mw = o.matrix_world
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
        cx, cy = tc.get("center", [0, 0])
        N = tc["strips"]; z0 = tc.get("z", 0); amp = tc["amp"]
        kill = []
        if tc.get("mode") == "bone":
            # ragged cuffs: along the bone axis a->b (fraction t), notches around the axis
            for side in ("l", "r"):
                A = arm.matrix_world @ arm.data.bones[tc["a"] + "_" + side].head_local
                B = arm.matrix_world @ arm.data.bones[tc["b"] + "_" + side].head_local
                ax = (B - A); L = ax.length; ax.normalize()
                ref = Vector((0, 0, 1)).cross(ax).normalized(); ref2 = ax.cross(ref)
                for f in bm.faces:
                    c = mw @ f.calc_center_median(); d = c - A
                    t = d.dot(ax) / L
                    if t < tc["t0"] - tc["amp"] - 0.05 or t > 1.6: continue
                    rad = (d - ax * d.dot(ax)).length
                    if rad > tc.get("radius", 0.2): continue
                    ang = math.atan2(d.dot(ref2), d.dot(ref))
                    u = (ang / (2 * math.pi) + 0.5) * N; k = int(math.floor(u)); fr = u - k
                    depth = amp * (0.3 + 0.7 * hashf(k + (0 if side == "l" else 50), 2))
                    tri = 1 - abs(fr - 0.5) * 2
                    if t > tc["t0"] - depth * (1 - tri ** 0.6): kill.append(f)
            kill = list(set(kill))
        if tc.get("mode") == "cape":
            # keep only what hangs behind the body (plus everything above ztop); drop sleeves (arm-weighted faces)
            rules = [([o.vertex_groups[g].index for g in o.vertex_groups.keys() if any(g.startswith(a) for a in bones)], thr) for bones, thr in tc.get("arm_rules", [[["upperarm", "lowerarm", "hand"], 0.5]])]
            dl = bm.verts.layers.deform.active
            for f in bm.faces:
                c = mw @ f.calc_center_median()
                if c.z < tc["ztop"] and c.y < tc["yback"] + tc.get("slope", 0) * (tc["ztop"] - c.z): kill.append(f); continue
                if dl is not None:
                    for groups, thr in rules:
                        aw = sum(sum(v[dl].get(g, 0) for g in groups) for v in f.verts) / len(f.verts)
                        if aw > thr: kill.append(f); break
            kill = list(set(kill))
        if tc.get("mode") == "open":
            # open the front of a robe below `ztop`: faces in front of the body within a half-width that widens downwards
            for f in bm.faces:
                c = mw @ f.calc_center_median()
                if c.z > tc["ztop"] or c.y > tc.get("yfront", -0.02): continue
                hw = tc["w0"] + (tc["ztop"] - c.z) * tc.get("flare", 0.15)
                if abs(c.x) < hw: kill.append(f)
        for f in (bm.faces if tc.get("mode", "hem") == "hem" else []):
            c = mw @ f.calc_center_median()
            if True:
                ang = math.atan2(c.y - cy, c.x - cx)
                u = (ang / (2 * math.pi) + 0.5) * N + 0.35 * math.sin(ang * 3.0)
                k = int(math.floor(u)); fr = u - k
                depth = amp * (0.25 + 0.75 * hashf(k, 1))
                tri = 1 - abs(fr - 0.5) * 2              # 0 at strip edges, 1 in the middle
                notch = depth * (1 - tri ** 0.6)          # V cut between strips
                line = z0 + notch + tc.get("slope", 0) * (c.y - cy)
                if c.z < line: kill.append(f)
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()
        print("tatter", o.name, "removed", len(kill), flush=True)

# --- push armour outwards along the normals so it sits over the robe ---
for key, d in cfg.get("push", {}).items():
    for o in find(key):
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
        bm.normal_update()
        # smooth the push direction over neighbours so seams and creases do not crack open
        nrm = {v.index: v.normal.copy() for v in bm.verts}
        for it in range(3):
            nn = {}
            for v in bm.verts:
                acc = nrm[v.index].copy()
                for e in v.link_edges: acc += nrm[e.other_vert(v).index]
                nn[v.index] = acc.normalized()
            nrm = nn
        for v in bm.verts: v.co += nrm[v.index] * (d / max(1e-6, o.matrix_world.to_scale()[0]))
        bm.to_mesh(o.data); bm.free()
        print("pushed", o.name, d)

# --- drop faces by position / facing (e.g. armour hidden under a cape) ---
for key, r in cfg.get("drop_faces", []):
    for o in find(key):
        mw = o.matrix_world; nm3 = mw.to_3x3()
        bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
        kill = []
        for f in bm.faces:
            c = mw @ f.calc_center_median(); n = (nm3 @ f.normal).normalized()
            if c.z < r.get("zmin", -9) or c.z > r.get("zmax", 9): continue
            if c.y < r.get("ymin", -9) or n.y < r.get("nymin", -9): continue
            if abs(c.x) > r.get("xmax", 9): continue
            kill.append(f)
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()
        print("drop_faces", o.name, len(kill))

# --- delete objects / parts by bounding region (e.g. unwanted armour pieces) ---
for key, boxes in cfg.get("cut_boxes", {}).items():
    for o in find(key):
        mw = o.matrix_world
        bm = bmesh.new(); bm.from_mesh(o.data)
        # connected islands whose centre falls in any box are removed
        bm.verts.ensure_lookup_table()
        seen = set(); kill = []
        for v0 in bm.verts:
            if v0.index in seen: continue
            isl = []; st = [v0]; seen.add(v0.index)
            while st:
                v = st.pop(); isl.append(v)
                for e in v.link_edges:
                    w = e.other_vert(v)
                    if w.index not in seen: seen.add(w.index); st.append(w)
            c = sum((mw @ v.co for v in isl), Vector()) / len(isl)
            if any(b[0] <= c.x <= b[3] and b[1] <= c.y <= b[4] and b[2] <= c.z <= b[5] for b in boxes):
                kill += isl
        bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(o.data); bm.free()
        print("cut_boxes", o.name, len(kill))

for o in list(mesh_objs()):
    if any(k in o.name.lower() for k in cfg.get("delete", [])):
        print("delete", o.name); bpy.data.objects.remove(o, do_unlink=True)

# --- remove body faces hidden under clothes (ray along the normal) ---
body = [o for o in mesh_objs() if ObjectService.get_object_type(o) in ("Basemesh", "Proxymeshes")]
occl = [o for o in mesh_objs() if any(k in o.name.lower() for k in cfg.get("occluders", []))]
if body and occl:
    trees = []
    for c in occl:
        bm = bmesh.new(); bm.from_mesh(c.data); bm.transform(c.matrix_world)
        trees.append(BVHTree.FromBMesh(bm)); bm.free()
    for b in body:
        me = b.data; mw = b.matrix_world; nm = mw.to_3x3().inverted().transposed()
        cov = []
        for v in me.vertices:
            p = mw @ v.co; n = (nm @ v.normal).normalized()
            cov.append(any(t.ray_cast(p + n * 0.002, n, cfg.get("cover_dist", 0.08))[0] is not None for t in trees))
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        kill = [f for f in bm.faces if all(cov[v.index] for v in f.verts)]
        print("hide_covered", b.name, len(bm.faces), "removed", len(kill), flush=True)
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(me); bm.free()

def apply_first(obj, mod):
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
        bpy.ops.object.modifier_apply(modifier=mod.name)
for o in mesh_objs():
    for key, budget in cfg.get("decimate", {}).items():
        if key in o.name.lower():
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002); bm.to_mesh(o.data); bm.free()
            cur = tris(o)
            if budget >= cur: break
            m = o.modifiers.new("dec", 'DECIMATE'); m.ratio = budget / cur; m.use_collapse_triangulate = True
            if cfg.get("dec_symmetry"): m.use_symmetry = True; m.symmetry_axis = 'X'
            apply_first(o, m)
            print("decimate", o.name, cur, "->", tris(o), flush=True)
            break

# --- uniform scale to the target height (armature + children), applied ---
dg = bpy.context.evaluated_depsgraph_get()
zmin, zmax = 1e9, -1e9
for o in mesh_objs():
    for v in o.data.vertices:
        z = (o.matrix_world @ v.co).z; zmin = min(zmin, z); zmax = max(zmax, z)
print("height before", round(zmax - zmin, 4), "zmin", round(zmin, 4))
if cfg.get("height"):
    k = cfg["height"] / (zmax - zmin)
    arm.scale = arm.scale * k
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects: o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    zmin, zmax = 1e9, -1e9
    for o in mesh_objs():
        for v in o.data.vertices:
            z = (o.matrix_world @ v.co).z; zmin = min(zmin, z); zmax = max(zmax, z)
    print("height after", round(zmax - zmin, 4), "zmin", round(zmin, 4), "k", k)

total = sum(tris(o) for o in mesh_objs())
for o in mesh_objs(): print("FINAL", o.name, tris(o), [m.material.name if m.material else None for m in o.material_slots])
print("TOTAL_TRIS", total)
out = os.path.abspath(cfg["out"])
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                          export_image_format='AUTO', export_apply=False, export_yup=True)
print("EXPORTED", out, os.path.getsize(out), round(time.time() - T0, 1), flush=True)
if cfg.get("blend"):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(cfg["blend"]))
sys.stdout.flush(); os._exit(0)
