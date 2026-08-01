import type { DesignModel, FurnitureObject, OpeningModel, Point2, RoomModel, WallModel } from './types';

export const materialPresets = ['Warm White','Cool White','Sandstone','Sage Accent','Terracotta Accent','Walnut Wood','Oak Wood','Charcoal Fabric','Ocean Blue','Brushed Metal','Clear Glass'];
export const objectPresets: Array<{ type: FurnitureObject['type']; name: string; size: [number,number,number]; material: string }> = [
  { type:'SOFA', name:'Three-seat sofa', size:[2.2,.9,.82], material:'Sandstone' },
  { type:'CHAIR', name:'Lounge chair', size:[.82,.82,.88], material:'Sage Accent' },
  { type:'BED', name:'Queen bed', size:[1.6,2.05,.55], material:'Warm White' },
  { type:'TABLE', name:'Dining table', size:[1.8,.9,.76], material:'Walnut Wood' },
  { type:'CABINET', name:'Storage cabinet', size:[1.4,.48,1.9], material:'Oak Wood' },
  { type:'TV_UNIT', name:'TV console', size:[1.8,.42,.55], material:'Walnut Wood' },
  { type:'PLANT', name:'Indoor plant', size:[.65,.65,1.45], material:'Sage Accent' },
  { type:'LAMP', name:'Floor lamp', size:[.45,.45,1.65], material:'Brushed Metal' },
  { type:'RUG', name:'Area rug', size:[2.2,1.6,.025], material:'Terracotta Accent' }
];

export function uid(prefix: string): string { return `${prefix}-${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`; }
export function cloneModel<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function distance(a: Point2,b: Point2): number { return Math.hypot(b[0]-a[0],b[1]-a[1]); }
export function wallLength(wall: WallModel): number { return distance(wall.start,wall.end); }
export function pointsEqual(a: Point2,b: Point2,epsilon=.0005): boolean { return Math.abs(a[0]-b[0])<epsilon && Math.abs(a[1]-b[1])<epsilon; }
export function polygonArea(points: Point2[]): number { return Math.abs(points.reduce((sum,p,i)=>sum+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0))/2; }
export function roomCenter(room: RoomModel): Point2 { return room.floorPolygon.reduce((sum,p)=>[sum[0]+p[0]/room.floorPolygon.length,sum[1]+p[1]/room.floorPolygon.length] as Point2,[0,0]); }
export function wallAngleDegrees(wall: WallModel): number { return Math.atan2(wall.end[1]-wall.start[1],wall.end[0]-wall.start[0])*180/Math.PI; }

export function wallsFromPolygon(roomId:string, points:Point2[], oldWalls:WallModel[]=[]): WallModel[] {
  return points.map((start,index)=>{
    const end=points[(index+1)%points.length];
    const existing=oldWalls.find(w=>pointsEqual(w.start,start)&&pointsEqual(w.end,end)) ?? oldWalls[index];
    return {
      id: existing?.id ?? `${roomId}-wall-${index+1}`,
      start:[...start],end:[...end],heightM:existing?.heightM,thicknessM:existing?.thicknessM ?? .12,
      material:existing?.material ?? 'Warm White',materialId:existing?.materialId,structuralStatus:existing?.structuralStatus ?? 'UNKNOWN',
      confidence:existing?.confidence,evidenceRefs:existing?.evidenceRefs,verificationStatus:existing?.verificationStatus,
      lockedAngle:existing?.lockedAngle,lockedLengthM:existing?.lockedLengthM,openings:existing?.openings ? cloneModel(existing.openings):[]
    };
  });
}

export function rectangleRoom(name:string,origin:Point2=[0,0],width=4,depth=3):RoomModel {
  const id=uid('room'); const points:Point2[]=[[origin[0],origin[1]],[origin[0]+width,origin[1]],[origin[0]+width,origin[1]+depth],[origin[0],origin[1]+depth]];
  return {id,name,heightM:2.8,floorPolygon:points,walls:wallsFromPolygon(id,points),objects:[],floorId:'floor-1',scaleStatus:'MEASURED_DRAFT',verificationStatus:'DESIGNER_REVIEW_REQUIRED',confidence:.5,measurements:[],unplacedOpeningProposals:[]};
}

export function lShapedRoom(name:string,origin:Point2=[0,0]):RoomModel {
  const id=uid('room'); const [x,y]=origin; const points:Point2[]=[[x,y],[x+4.5,y],[x+4.5,y+2],[x+2.6,y+2],[x+2.6,y+3.8],[x,y+3.8]];
  return {id,name,heightM:2.8,floorPolygon:points,walls:wallsFromPolygon(id,points),objects:[],floorId:'floor-1',scaleStatus:'MEASURED_DRAFT',verificationStatus:'DESIGNER_REVIEW_REQUIRED',confidence:.5,measurements:[],unplacedOpeningProposals:[]};
}

export function normalizeFurniture(raw: unknown): FurnitureObject | null {
  if(!raw||typeof raw!=='object')return null; const value=raw as Record<string,unknown>;
  if(!value.id||!Array.isArray(value.position)||!Array.isArray(value.size))return null;
  const types=['SOFA','BED','TABLE','CHAIR','CABINET','TV_UNIT','PLANT','LAMP','RUG','CUSTOM'] as const;
  const type=types.includes(value.type as never)?value.type as FurnitureObject['type']:'CUSTOM';
  return {
    ...(value as unknown as FurnitureObject), id:String(value.id),type,name:String(value.name??type),
    position:[Number(value.position[0]??0),Number(value.position[1]??0)],size:[Number(value.size[0]??1),Number(value.size[1]??1),Number(value.size[2]??1)],
    rotationY:Number(value.rotationY??0),visible:value.visible!==false,locked:value.locked===true
  };
}

export function addFurniture(model:DesignModel,roomId:string,preset=objectPresets[0],extra:Partial<FurnitureObject>={}):DesignModel {
  const next=cloneModel(model); const room=next.rooms.find(r=>r.id===roomId); if(!room)return next; const center=roomCenter(room);
  const object: FurnitureObject={id:uid('object'),type:preset.type,name:preset.name,position:center,size:preset.size,rotationY:0,material:preset.material,existingStatus:'NEW',visible:true,...extra};
  room.objects.push(object); return next;
}

export function updateSharedVertex(room:RoomModel,oldPoint:Point2,newPoint:Point2):RoomModel {
  const next=cloneModel(room); next.floorPolygon=next.floorPolygon.map(p=>pointsEqual(p,oldPoint)?newPoint:p); next.walls=next.walls.map(w=>({...w,start:pointsEqual(w.start,oldPoint)?newPoint:w.start,end:pointsEqual(w.end,oldPoint)?newPoint:w.end})); return next;
}

export function moveRoom(room:RoomModel,delta:Point2):RoomModel {
  const next=cloneModel(room); const move=(p:Point2):Point2=>[p[0]+delta[0],p[1]+delta[1]];
  next.floorPolygon=next.floorPolygon.map(move); next.walls=next.walls.map(w=>({...w,start:move(w.start),end:move(w.end)})); next.objects=next.objects.map(raw=>{const o=normalizeFurniture(raw);return o?{...o,position:move(o.position)}:raw}); return next;
}

export function rotateRoom(room:RoomModel,degrees:number,center=roomCenter(room)):RoomModel {
  const next=cloneModel(room); const a=degrees*Math.PI/180; const rotate=(p:Point2):Point2=>{const x=p[0]-center[0],y=p[1]-center[1];return [center[0]+x*Math.cos(a)-y*Math.sin(a),center[1]+x*Math.sin(a)+y*Math.cos(a)]};
  next.floorPolygon=next.floorPolygon.map(rotate); next.walls=next.walls.map(w=>({...w,start:rotate(w.start),end:rotate(w.end)})); next.objects=next.objects.map(raw=>{const o=normalizeFurniture(raw);return o?{...o,position:rotate(o.position),rotationY:o.rotationY+a}:raw});return next;
}

export function insertWallVertex(room:RoomModel,wallId:string,ratio=.5):RoomModel {
  const index=room.walls.findIndex(w=>w.id===wallId); if(index<0)return room; const wall=room.walls[index]; const point:Point2=[wall.start[0]+(wall.end[0]-wall.start[0])*ratio,wall.start[1]+(wall.end[1]-wall.start[1])*ratio];
  const next=cloneModel(room); next.floorPolygon.splice(index+1,0,point); next.walls=wallsFromPolygon(next.id,next.floorPolygon,next.walls); return next;
}

export function deleteVertex(room:RoomModel,vertexIndex:number):RoomModel {
  if(room.floorPolygon.length<=3)return room; const next=cloneModel(room); next.floorPolygon.splice(vertexIndex,1); next.walls=wallsFromPolygon(next.id,next.floorPolygon,next.walls); return next;
}

export function setWallLength(room:RoomModel,wallId:string,lengthM:number):RoomModel {
  const wall=room.walls.find(w=>w.id===wallId); if(!wall||lengthM<=.1)return room; const current=wallLength(wall)||1; const nextEnd:Point2=[wall.start[0]+(wall.end[0]-wall.start[0])*lengthM/current,wall.start[1]+(wall.end[1]-wall.start[1])*lengthM/current]; return updateSharedVertex(room,wall.end,nextEnd);
}

export function offsetWall(room:RoomModel,wallId:string,distanceM:number):RoomModel {
  const wall=room.walls.find(w=>w.id===wallId); if(!wall)return room; const len=wallLength(wall)||1; const normal:Point2=[-(wall.end[1]-wall.start[1])/len,(wall.end[0]-wall.start[0])/len]; const next=cloneModel(room);
  const newStart:Point2=[wall.start[0]+normal[0]*distanceM,wall.start[1]+normal[1]*distanceM]; const newEnd:Point2=[wall.end[0]+normal[0]*distanceM,wall.end[1]+normal[1]*distanceM];
  return updateSharedVertex(updateSharedVertex(next,wall.start,newStart),wall.end,newEnd);
}

export function addOpening(room:RoomModel,wallId:string,type:'DOOR'|'WINDOW'|'OPENING',proposal?:Partial<OpeningModel>):RoomModel {
  const next=cloneModel(room); const wall=next.walls.find(w=>w.id===wallId); if(!wall)return next; const length=wallLength(wall); const width=Math.min(proposal?.widthM??(type==='DOOR'?.9:type==='WINDOW'?1.2:1.4),Math.max(.3,length-.2));
  wall.openings.push({id:proposal?.id??uid('opening'),type,offsetM:proposal?.offsetM??Math.max(.1,(length-width)/2),widthM:width,heightM:proposal?.heightM??(type==='WINDOW'?1.2:2.1),bottomM:proposal?.bottomM??proposal?.sillM??(type==='WINDOW'?.9:0),sillM:proposal?.sillM??proposal?.bottomM??(type==='WINDOW'?.9:0),swing:proposal?.swing??(type==='DOOR'?'LEFT_IN':undefined),direction:proposal?.direction,evidenceRefs:proposal?.evidenceRefs,confidence:proposal?.confidence,verificationStatus:'DESIGNER_REVIEW_REQUIRED'}); return next;
}

export function modelBounds(model:DesignModel){const points=model.rooms.flatMap(r=>r.floorPolygon);if(!points.length)return{minX:0,minY:0,maxX:5,maxY:5};return{minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]))};}

function orientation(a:Point2,b:Point2,c:Point2){return Math.sign((b[1]-a[1])*(c[0]-b[0])-(b[0]-a[0])*(c[1]-b[1]));}
function segmentsIntersect(a:Point2,b:Point2,c:Point2,d:Point2){const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);return o1!==o2&&o3!==o4;}
export function polygonSelfIntersects(points:Point2[]):boolean{for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){if(Math.abs(i-j)<=1||(i===0&&j===points.length-1))continue;if(segmentsIntersect(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))return true;}return false;}

export function validateDesignModel(model:DesignModel):string[]{const errors:string[]=[];if(!model.rooms.length)errors.push('At least one room is required.');const ids=new Set<string>();model.rooms.forEach(room=>{if(ids.has(room.id))errors.push(`Duplicate room id ${room.id}.`);ids.add(room.id);if(room.floorPolygon.length<3)errors.push(`${room.name}: polygon needs at least three points.`);if(polygonArea(room.floorPolygon)<.25)errors.push(`${room.name}: floor area is too small.`);if(polygonSelfIntersects(room.floorPolygon))errors.push(`${room.name}: floor polygon self-intersects.`);if(room.heightM<1.8||room.heightM>6)errors.push(`${room.name}: ceiling height is outside the supported range.`);room.walls.forEach(w=>{const len=wallLength(w);if(len<.1)errors.push(`${room.name}: wall ${w.id} is too short.`);w.openings.forEach(o=>{if(o.offsetM<0||o.widthM<=0||o.offsetM+o.widthM>len+.001)errors.push(`${room.name}: opening ${o.id} does not fit its wall.`);if((o.bottomM??o.sillM??0)+o.heightM>room.heightM+.01)errors.push(`${room.name}: opening ${o.id} exceeds ceiling height.`);});});});return errors;}

export function snapObjectToRoom(object:FurnitureObject,room:RoomModel,mode:'FLOOR'|'WALL'|'CENTER'):FurnitureObject { if(mode==='CENTER')return{...object,position:roomCenter(room)}; if(mode==='FLOOR')return{...object,elevationM:0}; let closest:{wall:WallModel;point:Point2;distance:number}|null=null; for(const wall of room.walls){const ax=wall.start[0],ay=wall.start[1],bx=wall.end[0],by=wall.end[1];const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;const t=Math.max(0,Math.min(1,((object.position[0]-ax)*dx+(object.position[1]-ay)*dy)/(l2||1)));const point:[number,number]=[ax+t*dx,ay+t*dy];const d=distance(object.position,point);if(!closest||d<closest.distance)closest={wall,point,distance:d};} if(!closest)return object;return{...object,position:closest.point,rotationY:-Math.atan2(closest.wall.end[1]-closest.wall.start[1],closest.wall.end[0]-closest.wall.start[0])}; }

export function collisionWarnings(room:RoomModel):string[]{const objects=room.objects.map(normalizeFurniture).filter(Boolean) as FurnitureObject[];const out:string[]=[];for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){const a=objects[i],b=objects[j];const dx=Math.abs(a.position[0]-b.position[0]),dy=Math.abs(a.position[1]-b.position[1]);if(dx<(a.size[0]+b.size[0])/2&&dy<(a.size[1]+b.size[1])/2)out.push(`${a.name} overlaps ${b.name}`);}return out;}
