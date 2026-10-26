import bpy, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
arm = [o for o in bpy.data.objects if o.type=='ARMATURE'][0]
for b in arm.data.bones:
    if b.name.startswith(('MCH_femur','PIV_SHOULDER','MCH_forearm','HUMERUS','TIBIA','FOOT','HEAD','JAW','CONTROL_NECK', 'MCH_toes')):
        print('BONE', b.name, 'head', tuple(round(x,3) for x in b.head_local), 'tail', tuple(round(x,3) for x in b.tail_local), 'len', round(b.length,3))
mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
for o in bpy.data.objects:
    if o.type=='MESH' and o.name.startswith('BONES'):
        for v in o.data.vertices:
            co = o.matrix_world @ v.co
            mn = Vector(map(min, mn, co)); mx = Vector(map(max, mx, co))
        print(o.name, 'bbox')
print('BBOX', mn, mx)
ico = bpy.data.objects.get('Icosphere'); print('ICO', ico and ico.users_collection)
