import bpy, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[-1])
for o in bpy.data.objects:
    if o.type == 'MESH':
        zs = [(o.matrix_world @ v.co) for v in o.data.vertices]
        print(o.name, 'x', round(min(p.x for p in zs),3), round(max(p.x for p in zs),3), 'y', round(min(p.y for p in zs),3), round(max(p.y for p in zs),3), 'z', round(min(p.z for p in zs),3), round(max(p.z for p in zs),3), 'scale', tuple(round(s,3) for s in o.matrix_world.to_scale()))
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for b in arm.data.bones:
    if b.name in ('pelvis','Head','neck_01','upperarm_l','lowerarm_l','hand_l','thigh_l','calf_l','foot_l','ball_l','spine_03','clavicle_l'):
        print('BONE', b.name, tuple(round(x,3) for x in arm.matrix_world @ b.head_local), tuple(round(x,3) for x in arm.matrix_world @ b.tail_local))
