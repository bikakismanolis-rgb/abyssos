# Bakes the hill-troll skin: the original pale/pink baked texture re-mapped by luminance onto a grey-green stone palette,
# red blotches turned into dark olive-brown, large-scale 3D mottling (object-space noise, no UV seams), fine grain,
# baked AO multiplied in, darker earth-stained feet and shins. Emission bake (Cycles CPU) -> tex/skin_troll.png
import bpy, os
TD = os.environ['TD']; RES = int(os.environ.get('RES', '2048')); H = float(os.environ.get('HGT', '3.03'))
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
sc.render.bake.margin = 8; sc.render.bake.use_clear = True
med = bpy.data.objects['med']
for o in bpy.data.objects: o.hide_render = (o != med)
def img(name, cs):
    im = bpy.data.images.load(os.path.join(TD, 'tex', name)); im.colorspace_settings.name = cs; return im
mat = bpy.data.materials.new('SkinBake'); mat.use_nodes = True
nt = mat.node_tree; N = nt.nodes; L = nt.links
for n in list(N): N.remove(n)
def node(t, **kw):
    n = N.new(t)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def srgb(r, g, b):
    f = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)
def mix(fac, a, b, blend='MIX'):
    m = node('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend
    if isinstance(fac, float): m.inputs['Factor'].default_value = fac
    else: L.new(fac, m.inputs['Factor'])
    for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
        if isinstance(v, tuple): sock.default_value = v
        else: L.new(v, sock)
    return m.outputs[2]
out = node('ShaderNodeOutputMaterial'); emit = node('ShaderNodeEmission'); L.new(emit.outputs[0], out.inputs['Surface'])
uv = node('ShaderNodeUVMap'); uv.uv_map = med.data.uv_layers[0].name
base = node('ShaderNodeTexImage'); base.image = img('troll_baseTexBaked.png', 'sRGB'); L.new(uv.outputs[0], base.inputs[0])
aot = node('ShaderNodeTexImage'); aot.image = img('troll_occlusion.png', 'Non-Color'); L.new(uv.outputs[0], aot.inputs[0])
tc = node('ShaderNodeTexCoord')
# luminance -> stone palette
bw = node('ShaderNodeRGBToBW'); L.new(base.outputs['Color'], bw.inputs[0])
ramp = node('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
e[0].position, e[0].color = 0.05, srgb(26, 29, 23)
e[1].position, e[1].color = 0.62, srgb(108, 114, 92)
e.new(0.30).color = srgb(62, 69, 53)
e.new(0.80).color = srgb(136, 137, 116)
L.new(bw.outputs[0], ramp.inputs[0])
col = ramp.outputs['Color']
# redness of the source (blotches, lips, knuckles) -> dark olive-brown
sep = node('ShaderNodeSeparateColor'); L.new(base.outputs['Color'], sep.inputs[0])
red = node('ShaderNodeMath', operation='SUBTRACT'); L.new(sep.outputs[0], red.inputs[0]); L.new(sep.outputs[1], red.inputs[1])
redm = node('ShaderNodeMapRange'); redm.inputs['From Min'].default_value = 0.22; redm.inputs['From Max'].default_value = 0.5
redm.inputs['To Min'].default_value = 0.0; redm.inputs['To Max'].default_value = 0.75; L.new(red.outputs[0], redm.inputs['Value'])
col = mix(redm.outputs[0], col, srgb(52, 44, 34))
# broad mottling: dark mossy patches + pale stony patches (object space, so continuous across UV seams)
n1 = node('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.6; n1.inputs['Detail'].default_value = 5; n1.inputs['Roughness'].default_value = 0.62
L.new(tc.outputs['Object'], n1.inputs['Vector'])
m1 = node('ShaderNodeMapRange'); m1.inputs['From Min'].default_value = 0.48; m1.inputs['From Max'].default_value = 0.66; m1.inputs['To Max'].default_value = 0.65
L.new(n1.outputs['Fac'], m1.inputs['Value'])
col = mix(m1.outputs[0], col, srgb(36, 46, 28))
n2 = node('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 3.5; n2.inputs['Detail'].default_value = 4; n2.inputs['Roughness'].default_value = 0.55
L.new(tc.outputs['Object'], n2.inputs['Vector'])
m2 = node('ShaderNodeMapRange'); m2.inputs['From Min'].default_value = 0.56; m2.inputs['From Max'].default_value = 0.72; m2.inputs['To Max'].default_value = 0.4
L.new(n2.outputs['Fac'], m2.inputs['Value'])
col = mix(m2.outputs[0], col, srgb(128, 130, 118))
# fine grain / pitting
n3 = node('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 38.0; n3.inputs['Detail'].default_value = 3
L.new(tc.outputs['Object'], n3.inputs['Vector'])
m3 = node('ShaderNodeMapRange'); m3.inputs['From Min'].default_value = 0.3; m3.inputs['From Max'].default_value = 0.7
m3.inputs['To Min'].default_value = 0.82; m3.inputs['To Max'].default_value = 1.08; L.new(n3.outputs['Fac'], m3.inputs['Value'])
g3 = node('ShaderNodeCombineColor'); [L.new(m3.outputs[0], g3.inputs[i]) for i in range(3)]
col = mix(1.0, col, g3.outputs[0], 'MULTIPLY')
# earth stains up the feet and shins
sxyz = node('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sxyz.inputs[0])
n4 = node('ShaderNodeTexNoise'); n4.inputs['Scale'].default_value = 6.0; L.new(tc.outputs['Object'], n4.inputs['Vector'])
hz = node('ShaderNodeMath', operation='MULTIPLY_ADD'); hz.inputs[1].default_value = 0.35 * H / 3; L.new(n4.outputs['Fac'], hz.inputs[0]); L.new(sxyz.outputs['Z'], hz.inputs[2])
dz = node('ShaderNodeMapRange'); dz.inputs['From Min'].default_value = 0.75 * H / 3; dz.inputs['From Max'].default_value = 0.25 * H / 3
dz.inputs['To Min'].default_value = 0.0; dz.inputs['To Max'].default_value = 0.7; L.new(hz.outputs[0], dz.inputs['Value'])
col = mix(dz.outputs[0], col, srgb(44, 38, 28))
# baked ambient occlusion, partly
aom = node('ShaderNodeMapRange'); aom.inputs['To Min'].default_value = 0.35; L.new(aot.outputs['Color'], aom.inputs['Value'])
aoc = node('ShaderNodeCombineColor'); [L.new(aom.outputs[0], aoc.inputs[i]) for i in range(3)]
col = mix(0.75, col, aoc.outputs[0], 'MULTIPLY')
L.new(col, emit.inputs['Color'])
med.data.materials.clear(); med.data.materials.append(mat)
target = bpy.data.images.new('skin_troll', RES, RES, alpha=False); target.colorspace_settings.name = 'sRGB'
tn = node('ShaderNodeTexImage'); tn.image = target; N.active = tn; tn.select = True
bpy.ops.object.select_all(action='DESELECT'); med.select_set(True); bpy.context.view_layer.objects.active = med
bpy.ops.object.bake(type='EMIT', margin=8)
target.filepath_raw = os.path.join(TD, 'tex', 'skin_troll.png'); target.file_format = 'PNG'; target.save()
print('BAKED', target.filepath_raw)
