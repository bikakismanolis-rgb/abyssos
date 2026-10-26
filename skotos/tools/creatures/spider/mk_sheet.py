import json,sys
# usage: mk_sheet.py out.png clip:view:t1,t2,... [clip:view:...]
out=sys.argv[1]; frames=[]
for spec in sys.argv[2:]:
    clip,view,ts=spec.split(':')
    for t in ts.split(','):
        f={"clip":clip,"sec":float(t),"view":view,"dist":3.0,"center":[0,0.32,0.05]}
        if clip=='rest': del f['clip']
        frames.append(f)
cols=max(len(s.split(':')[2].split(',')) for s in sys.argv[2:])
json.dump({"model":"prev.glb","out":out,"cell":[300,270],"cols":cols,"frames":frames},open('_sheet.json','w'))
