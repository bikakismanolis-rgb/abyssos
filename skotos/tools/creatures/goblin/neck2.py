import bpy
o=bpy.data.objects['Neck']; m=o.modifiers[0]
print('mod', m.name, m.object.name, repr(m.vertex_group), m.invert_vertex_group, m.use_multi_modifier, m.show_viewport, m.show_render)
vs=[v.co for v in o.data.vertices]
print('data z', min(v.z for v in vs), max(v.z for v in vs))
print('shape keys', o.data.shape_keys and [k.name for k in o.data.shape_keys.key_blocks])
print('matrix_parent_inverse', o.matrix_parent_inverse)
print('delta', o.delta_location, o.delta_scale, o.location, o.rotation_euler, o.scale)
arm=bpy.data.objects['Armature']
print('arm pose_position', arm.data.pose_position)
for n in ['spine4','spine3','neck']:
    pb=arm.pose.bones[n]; print(n, pb.matrix.translation, pb.bone.matrix_local.translation, pb.matrix_basis)
