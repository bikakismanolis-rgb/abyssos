# Blender 4.2: turns the Kelgar goblin (CC0, CDmir) into a clean FK rig in metres and exports the bind-pose mesh as GLB.
#  - IK/copy-rotation constraints and control bones removed, feet reparented to the shins, spine1 becomes the root bone
#  - all rigged meshes joined into one object (3 materials: skin atlas, eyes, gold earring), only the 'UV' atlas kept
#  - scaled by GOB_SCALE so the goblin is ~1.15 m tall, Y up / +Z forward on export
# env: GD (work dir), GOB_SCALE, GOB_TEX (recoloured base colour png), GOB_NORM (normal png)
import bpy, os
from mathutils import Matrix
D = os.environ['GD']; S = float(os.environ['GOB_SCALE'])
arm = bpy.data.objects['Armature']
sc = bpy.context.scene
# make every object part of the scene and visible (some live in excluded / hidden collections of the 2.7x file)
for o in bpy.data.objects:
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
def unhide(lc):
    lc.exclude = False; lc.hide_viewport = False
    for ch in lc.children: unhide(ch)
unhide(bpy.context.view_layer.layer_collection)
for c in bpy.data.collections: c.hide_viewport = False; c.hide_render = False
for o in bpy.data.objects: o.hide_set(False); o.hide_viewport = False; o.hide_render = False
bpy.context.view_layer.update()
# 1) remove constraints, animation, control bones
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
    pb.matrix_basis.identity()
if arm.animation_data: arm.animation_data.action = None
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'ARMATURE') or (o.type == 'MESH' and not any(m.type == 'ARMATURE' for m in o.modifiers)):
        bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
bpy.context.view_layer.update()
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for side in 'LR':
    eb['foot_' + side].use_connect = False
    eb['foot_' + side].parent = eb['lowerleg_' + side]
for b in list(eb):
    if not b.use_deform: eb.remove(b)
bpy.ops.object.mode_set(mode='OBJECT')
print('bones', len(arm.data.bones), [b.name for b in arm.data.bones if b.parent is None])
# 2) UVs: keep only the atlas layer 'UV'
for o in meshes:
    uvs = o.data.uv_layers
    for n in [l.name for l in uvs if l.name != 'UV']: uvs.remove(uvs.get(n))
    l = uvs.get('UV'); l.name = 'UVMap'; uvs.active = l; l.active_render = True
    for g in [g for g in o.vertex_groups if g.name not in arm.data.bones]: o.vertex_groups.remove(g)
# 3) scale everything about the origin and apply
for o in [arm] + meshes:
    o.matrix_world = Matrix.Scale(S, 4) @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in [arm] + meshes: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# 4) materials
def img(path, colorspace):
    im = bpy.data.images.load(path); im.colorspace_settings.name = colorspace; im.pack(); return im
base = img(os.environ['GOB_TEX'], 'sRGB'); norm = img(os.environ['GOB_NORM'], 'Non-Color')
def principled(m):
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(p.outputs[0], out.inputs[0])
    return nt, p
m = bpy.data.materials['goblin']; nt, p = principled(m)
t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = norm
nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
p.inputs['Roughness'].default_value = 0.78; p.inputs['Metallic'].default_value = 0.0
m = bpy.data.materials['Eyes']; nt, p = principled(m)
t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
nt.links.new(t.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1.0
p.inputs['Roughness'].default_value = 0.25
m = bpy.data.materials['Gold']; nt, p = principled(m)
t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
p.inputs['Roughness'].default_value = 0.45; p.inputs['Metallic'].default_value = 0.8
# 5) join meshes into one object
bpy.ops.object.select_all(action='DESELECT')
body = bpy.data.objects['Body']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = 'Goblin'; body.data.validate(verbose=True)
mods = [m for m in body.modifiers if m.type == 'ARMATURE']
for m in mods[1:]: body.modifiers.remove(m)
body.parent = arm
print('materials', [s.material.name for s in body.material_slots], 'verts', len(body.data.vertices), 'tris', sum(len(p.vertices) - 2 for p in body.data.polygons))
arm.name = 'Armature'
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(D, 'goblin_base.glb'), export_format='GLB', export_animations=False, export_apply=False,
    export_lights=False, export_cameras=False, export_image_format='AUTO', export_yup=True, export_skins=True, export_def_bones=False,
    export_tangents=False, export_attributes=False)
print('EXPORTED')
