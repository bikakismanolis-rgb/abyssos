# Stage 2: bake an old, yellowed, grimy bone colour (procedural stains + AO grime in the crevices + grave dirt on the
# feet) into per-vertex colours of the game mesh, then export skeleton_base.glb (skinned mesh + armature, no clips).
# usage: blender -b --python bake.py -- base.blend out.glb texdir
import bpy, sys, os
from mathutils import Vector
BLEND, OUT, TEX = sys.argv[-3], sys.argv[-2], sys.argv[-1]
os.makedirs(TEX, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = int(os.environ.get('BAKE_SAMPLES', '48'))
sc.render.bake.margin = 6
lo, hi, arm = bpy.data.objects['Skeleton'], bpy.data.objects['HI'], bpy.data.objects['Armature']
lo.data.validate(verbose=False)
RES = int(os.environ.get('BAKE_RES', '1024'))

me = lo.data
while me.color_attributes: me.color_attributes.remove(me.color_attributes[0])
ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
me.color_attributes.active_color = ca
me.color_attributes.render_color_index = 0
# ---------- bake material: procedural bone colour into emission ----------
mat = bpy.data.materials.new('BoneBake'); mat.use_nodes = True
nt = mat.node_tree; N = nt.nodes; Lk = nt.links
for n in list(N): N.remove(n)
def node(t, **kw):
    n = N.new(t)
    for k, v in kw.items(): setattr(n, k, v)
    return n
out = node('ShaderNodeOutputMaterial')
emit = node('ShaderNodeEmission')
Lk.new(emit.outputs[0], out.inputs['Surface'])
tc = node('ShaderNodeTexCoord')
# broad stains
n1 = node('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 5.0; n1.inputs['Detail'].default_value = 6; n1.inputs['Roughness'].default_value = 0.6
Lk.new(tc.outputs['Object'], n1.inputs['Vector'])
r1 = node('ShaderNodeValToRGB'); e = r1.color_ramp.elements
e[0].position, e[1].position = 0.4, 0.62
e[0].color = (0.43, 0.37, 0.255, 1)   # yellowed old bone
e[1].color = (0.15, 0.11, 0.065, 1)   # brown stain
Lk.new(n1.outputs['Fac'], r1.inputs['Fac'])
# fine mottling / pitting
n2 = node('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 60.0; n2.inputs['Detail'].default_value = 4
Lk.new(tc.outputs['Object'], n2.inputs['Vector'])
r2 = node('ShaderNodeMapRange'); r2.inputs['From Min'].default_value = 0.3; r2.inputs['From Max'].default_value = 0.7
r2.inputs['To Min'].default_value = 0.72; r2.inputs['To Max'].default_value = 1.1
Lk.new(n2.outputs['Fac'], r2.inputs['Value'])
# every bone a little different: some darker, browner (random value per connected piece)
gi = node('ShaderNodeNewGeometry')
rpi = node('ShaderNodeMapRange'); rpi.inputs['To Min'].default_value = 0.0; rpi.inputs['To Max'].default_value = 0.55
Lk.new(gi.outputs['Random Per Island'], rpi.inputs['Value'])
var = node('ShaderNodeMix'); var.data_type = 'RGBA'; var.blend_type = 'MIX'
Lk.new(rpi.outputs[0], var.inputs['Factor']); Lk.new(r1.outputs['Color'], var.inputs[6]); var.inputs[7].default_value = (0.20, 0.155, 0.095, 1)
mul = node('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
Lk.new(var.outputs[2], mul.inputs[6])
cmb = node('ShaderNodeCombineColor'); [Lk.new(r2.outputs[0], cmb.inputs[i]) for i in range(3)]
Lk.new(cmb.outputs[0], mul.inputs[7])
# grave dirt creeping up from the feet
sep = node('ShaderNodeSeparateXYZ'); Lk.new(tc.outputs['Object'], sep.inputs[0])
n3 = node('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 14.0
Lk.new(tc.outputs['Object'], n3.inputs['Vector'])
hz = node('ShaderNodeMath', operation='MULTIPLY_ADD'); hz.inputs[1].default_value = 0.35; Lk.new(n3.outputs['Fac'], hz.inputs[0]); Lk.new(sep.outputs['Z'], hz.inputs[2])
dz = node('ShaderNodeMapRange'); dz.inputs['From Min'].default_value = 0.62; dz.inputs['From Max'].default_value = 0.2
dz.inputs['To Min'].default_value = 0.0; dz.inputs['To Max'].default_value = 0.85
Lk.new(hz.outputs[0], dz.inputs['Value'])
dirt = node('ShaderNodeMix'); dirt.data_type = 'RGBA'
Lk.new(dz.outputs[0], dirt.inputs['Factor']); Lk.new(mul.outputs[2], dirt.inputs[6]); dirt.inputs[7].default_value = (0.075, 0.055, 0.035, 1)
# grime in crevices: ambient occlusion
ao = node('ShaderNodeAmbientOcclusion'); ao.samples = 32; ao.inputs['Distance'].default_value = 0.06
ar = node('ShaderNodeMapRange'); ar.inputs['From Min'].default_value = 0.25; ar.inputs['From Max'].default_value = 0.92
Lk.new(ao.outputs['AO'], ar.inputs['Value'])
sm = node('ShaderNodeMath', operation='POWER'); sm.inputs[1].default_value = 1.6; Lk.new(ar.outputs[0], sm.inputs[0])
grime = node('ShaderNodeMix'); grime.data_type = 'RGBA'
Lk.new(sm.outputs[0], grime.inputs['Factor']); grime.inputs[6].default_value = (0.035, 0.026, 0.017, 1); Lk.new(dirt.outputs[2], grime.inputs[7])
Lk.new(grime.outputs[2], emit.inputs['Color'])
lo.data.materials.clear(); lo.data.materials.append(mat)

def select_only(objs, active):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active

# colour bake into the vertex colours; the high-res copy is not needed
hi.hide_render = True
select_only([lo], lo)
sc.render.bake.target = 'VERTEX_COLORS'
bpy.ops.object.bake(type='EMIT', target='VERTEX_COLORS')
print('BAKED vertex colours')

# ---------- final material ----------
fm = bpy.data.materials.new('Bone'); fm.use_nodes = True
nt = fm.node_tree; bsdf = nt.nodes['Principled BSDF']
va = nt.nodes.new('ShaderNodeVertexColor'); va.layer_name = 'Col'
nt.links.new(va.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.82
bsdf.inputs['Metallic'].default_value = 0.0
lo.data.materials.clear(); lo.data.materials.append(fm)
bpy.data.objects.remove(hi)
bpy.ops.wm.save_as_mainfile(filepath=BLEND.replace('.blend', '_baked.blend'))
select_only([arm, lo], arm)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_animations=False,
                          export_skins=True, export_materials='EXPORT', export_tangents=False, export_vertex_color='MATERIAL')
print('EXPORTED', OUT)
