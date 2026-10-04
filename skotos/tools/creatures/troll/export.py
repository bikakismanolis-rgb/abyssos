# Stage 3 (Blender 4.2): materials from PNGs and GLB export of the bind-pose rig (no clips).
# env: TD work dir, IN blend, OUT glb, SKIN_TEX, SKIN_NRM, CLOTH_TEX, CLOTH_NRM, EYE_TEX
import bpy, os
E = os.environ
bpy.ops.wm.open_mainfile(filepath=E['IN'])
def img(path, cs):
    im = bpy.data.images.load(path); im.colorspace_settings.name = cs; return im
def mat(name, base, normal=None, rough=0.8, alpha=False, emit=0.0, nstr=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(p.outputs[0], out.inputs[0])
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(base, 'sRGB'); nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    if alpha:
        nt.links.new(t.outputs['Alpha'], p.inputs['Alpha']); m.blend_method = 'CLIP'; m.alpha_threshold = 0.5
    else:
        m.blend_method = 'OPAQUE'
    if normal:
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img(normal, 'Non-Color')
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr
        nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    if emit:
        nt.links.new(t.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = emit
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = 0.0
    return m
objs = {o.name: o for o in bpy.data.objects}
def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m)
setmat(objs['med'], mat('troll_skin', E['SKIN_TEX'], E.get('SKIN_NRM'), rough=float(E.get('SKIN_ROUGH', '0.78'))))
setmat(objs['cloth'], mat('loincloth', E['CLOTH_TEX'], E.get('CLOTH_NRM'), rough=0.92, alpha=True))
setmat(objs['eye med'], mat('troll_eye', E['EYE_TEX'], None, rough=0.25, emit=float(E.get('EYE_EMIT', '0'))))
# one object (one skinned mesh, three primitives): body, loincloth, eyes
bpy.ops.object.select_all(action='DESELECT')
for n in ('med', 'cloth', 'eye med'): objs[n].select_set(True)
bpy.context.view_layer.objects.active = objs['med']
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active; body.name = 'troll'
mods = [m for m in body.modifiers if m.type == 'ARMATURE']
for m in mods[1:]: body.modifiers.remove(m)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.name = o.name
        uvs = o.data.uv_layers
        for n in [l.name for l in uvs][1:]: uvs.remove(uvs.get(n))
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=E['OUT'], export_format='GLB', export_animations=False, export_apply=False,
    export_lights=False, export_cameras=False, export_image_format='AUTO', export_yup=True, export_skins=True, export_def_bones=False,
    export_tangents=False, export_attributes=False)
print('EXPORTED', E['OUT'])
