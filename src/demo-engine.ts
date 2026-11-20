export type DemoUser = {id:string;name:string;email:string;avatar:number;photo_url:null|string;status:'approved'|'pending'|'rejected';is_admin:boolean;online:boolean;last_seen:string|null;email_notifications:boolean};
export type DemoMessage = {id:string;chat_id:string;sender_id:string;type:'text'|'emoji'|'image';text:string|null;emoji:string|null;image_url:string|null;created_at:string;edited:boolean;reply_to_id:string|null;reply_to:any;reactions:{userId:string;emoji:string}[]};
export type DemoChat = {id:string;isGroup:boolean;name:string|null;photoUrl:string|null;createdAt:string;unreadCount:number;memberIds:string[]};
export type DemoState={version:1;currentId:string;users:DemoUser[];chats:DemoChat[];messages:DemoMessage[];photos:{id:string;title:string;photo_url:string;created_at:string;author_name:string}[]};
export class DemoError extends Error {constructor(public status:number,message:string){super(message);}}
const uid=()=>globalThis.crypto.randomUUID();
export function seedDemo():DemoState{
 const ago=(minutes:number)=>new Date(Date.now()-minutes*60000).toISOString();
 const users:DemoUser[]=[['alex','Demo Member 1',3,true],['sam','Demo Member 2',6,false],['jules','Demo Member 3',12,false],['taylor','Demo Member 4',8,false],['casey','Demo Member 5',15,false]].map(([id,name,avatar,online])=>({id:String(id),name:String(name),email:`${id}@demo.example`,avatar:Number(avatar),photo_url:null,status:id==='casey'?'pending':'approved',is_admin:id==='alex',online:Boolean(online),last_seen:ago(45),email_notifications:false}));
 const chats:DemoChat[]=[{id:'weekend',isGroup:true,name:'Weekend plans',photoUrl:null,createdAt:ago(4000),unreadCount:2,memberIds:['alex','sam','jules','taylor']},{id:'sam-chat',isGroup:false,name:null,photoUrl:null,createdAt:ago(3000),unreadCount:0,memberIds:['alex','sam']},{id:'photo-club',isGroup:true,name:'Photo club',photoUrl:null,createdAt:ago(2000),unreadCount:0,memberIds:['alex','jules','taylor']}];
 const m=(id:string,chat_id:string,sender_id:string,text:string,minutes:number):DemoMessage=>({id,chat_id,sender_id,text,type:'text',image_url:null,emoji:null,created_at:ago(minutes),edited:false,reply_to_id:null,reply_to:null,reactions:[]});
 const messages=[m('w1','weekend','sam',"Can everyone make it to the park on Saturday?",150),m('w2','weekend','jules',"Saturday works for me.",145),m('w3','weekend','alex',"I will bring snacks.",140),m('w4','weekend','taylor',"See you at the entrance!",75),m('w5','weekend','sam',"Let us meet at noon.",30),m('s1','sam-chat','sam',"I added two sample photos.",200),m('s2','sam-chat','alex',"Thanks for sharing!",195),m('s3','sam-chat','sam',"Does Sunday work for the next outing?",90),m('p1','photo-club','jules',"Sunday afternoon works.",100),m('p2','photo-club','taylor',"Great, see you then.",60)];
 messages[1].reactions=[{userId:'alex',emoji:'❤️'},{userId:'sam',emoji:'❤️'}];
 return {version:1,currentId:'alex',users,chats,messages,photos:[{id:'park',title:'A sunny afternoon',photo_url:'/demo/park.svg',created_at:ago(240),author_name:'Demo Member'},{id:'mountains',title:'A mountain escape',photo_url:'/demo/mountains.svg',created_at:ago(1500),author_name:'Demo Member'}]};
}
export function createDemoEngine(initial:DemoState=seedDemo()){
 const state=structuredClone(initial);
 const requireChat=(id:string)=>{const chat=state.chats.find(c=>c.id===id&&c.memberIds.includes(state.currentId));if(!chat)throw new DemoError(404,'Conversation not found');return chat;};
 const user=()=>state.users.find(u=>u.id===state.currentId)!;
 const viewChat=(c:DemoChat)=>{const last=state.messages.filter(m=>m.chat_id===c.id).slice(-1)[0];return {...c,members:c.memberIds.map(id=>state.users.find(u=>u.id===id)!).filter(Boolean),lastMessage:last?{id:last.id,type:last.type,text:last.text,emoji:last.emoji,senderId:last.sender_id,createdAt:last.created_at}:null};};
 const request=(raw:string,method='GET',body:any={}):any=>{
  const [pathname,query='']=raw.split('?');const parts=pathname.split('/').filter(Boolean);const me=user();
  if(pathname==='/auth/login'){state.currentId='alex';return {accessToken:'demo-session',refreshToken:'demo-refresh',user:user()};}
  if(pathname==='/auth/logout')return {};
  if(pathname==='/users/me'&&method==='GET')return me;
  if((pathname==='/users/me'||pathname==='/users/me/photo')&&method==='PATCH'){if(typeof body.name==='string')me.name=body.name.trim().slice(0,60)||me.name;if(Number.isInteger(body.avatar))me.avatar=Math.max(0,Math.min(19,body.avatar));if(typeof body.photoUrl==='string'&&/^(data:image\/(png|jpeg|webp|gif);base64,|blob:)/.test(body.photoUrl))me.photo_url=body.photoUrl;return me;}
  if(pathname==='/users')return state.users.filter(u=>u.status==='approved');
  if(pathname==='/users/pending')return state.users.filter(u=>u.status==='pending');
  if(pathname==='/users/rejected')return state.users.filter(u=>u.status==='rejected').map(u=>({...u,log_old_status:'pending',log_new_status:'rejected',log_changed_at:new Date().toISOString(),changed_by_id:me.id,changed_by_name:me.name}));
  if(parts[0]==='users'&&['approve','reject'].includes(parts[2])){const target=state.users.find(u=>u.id===parts[1]);if(!target)throw new DemoError(404,'Sample member not found');target.status=parts[2]==='approve'?'approved':'rejected';return target;}
  if(pathname==='/chats'&&method==='GET')return state.chats.filter(c=>c.memberIds.includes(me.id)).map(viewChat);
  if(pathname==='/chats/dm'&&method==='POST'){if(!state.users.some(u=>u.id===body.targetUserId&&u.status==='approved'))throw new DemoError(400,'Choose a sample member');let c=state.chats.find(c=>!c.isGroup&&c.memberIds.includes(me.id)&&c.memberIds.includes(body.targetUserId));if(!c){c={id:uid(),isGroup:false,name:null,photoUrl:null,createdAt:new Date().toISOString(),unreadCount:0,memberIds:[me.id,body.targetUserId]};state.chats.push(c);}return {chatId:c.id};}
  if(pathname==='/chats/group'&&method==='POST'){const ids=[...new Set([me.id,...(body.memberIds||[])])].filter(id=>state.users.some(u=>u.id===id&&u.status==='approved'));const c:DemoChat={id:uid(),isGroup:true,name:String(body.name||'New group').slice(0,60),photoUrl:null,createdAt:new Date().toISOString(),unreadCount:0,memberIds:ids};state.chats.push(c);return {chatId:c.id};}
  if(parts[0]==='chats'&&parts[1]){
   const c=requireChat(parts[1]);
   if(parts[2]==='read'){c.unreadCount=0;return {};}
   if(parts[2]==='name'&&method==='PATCH'){c.name=String(body.name).slice(0,60);return {id:c.id,name:c.name};}
   if(parts[2]==='photo'&&method==='PATCH'){c.photoUrl=body.photoUrl;return viewChat(c);}
   if(parts[2]==='members'){if(method==='POST'&&!c.memberIds.includes(body.userId)&&state.users.some(u=>u.id===body.userId&&u.status==='approved'))c.memberIds.push(body.userId);if(method==='DELETE')c.memberIds=c.memberIds.filter(id=>id!==parts[3]);return {};}
   if(parts.length===2&&method==='DELETE'){if(!c.isGroup)throw new DemoError(400,'Only groups can be deleted');state.chats=state.chats.filter(x=>x.id!==c.id);state.messages=state.messages.filter(m=>m.chat_id!==c.id);return {};}
   if(parts[2]==='messages'){
    if(parts.length===3&&method==='GET'){const before=new URLSearchParams(query).get('before');return state.messages.filter(m=>m.chat_id===c.id&&(!before||m.created_at<before)).slice(-50);}
    if(parts.length===3&&method==='POST'){
     if(!['text','emoji','image'].includes(body.type))throw new DemoError(400,'Unsupported demo message type');
     if(body.type==='text'&&(!String(body.text||'').trim()||String(body.text).length>2000))throw new DemoError(400,'Messages must be 1–2000 characters');
     const ref=state.messages.find(m=>m.id===body.replyToId&&m.chat_id===c.id);const msg:DemoMessage={id:uid(),chat_id:c.id,sender_id:me.id,type:body.type,text:body.text||null,image_url:body.imageUrl||null,emoji:body.emoji||null,created_at:new Date().toISOString(),edited:false,reply_to_id:ref?.id||null,reply_to:ref?{id:ref.id,senderId:ref.sender_id,type:ref.type,text:ref.text,imageUrl:ref.image_url,emoji:ref.emoji}:null,reactions:[]};state.messages.push(msg);if(state.messages.length>200)state.messages.splice(0,state.messages.length-200);return msg;
    }
    const msg=state.messages.find(m=>m.chat_id===c.id&&m.id===parts[3]);if(!msg)throw new DemoError(404,'Message not found');
    if(parts[4]==='reactions'){msg.reactions=msg.reactions.filter(r=>r.userId!==me.id);if(method==='POST')msg.reactions.push({userId:me.id,emoji:String(body.emoji).slice(0,24)});return {};}
    if(msg.sender_id!==me.id)throw new DemoError(403,'You can only change your own demo messages');
    if(method==='DELETE'){state.messages=state.messages.filter(m=>m.id!==msg.id);return {};}
    if(method==='PATCH'){const text=String(body.text||'').trim();if(!text||text.length>2000)throw new DemoError(400,'Messages must be 1–2000 characters');msg.text=text;msg.edited=true;return msg;}
   }
  }
  if(pathname==='/photos'&&method==='GET')return state.photos;
  if(pathname==='/photos'&&method==='POST'){const photo={id:uid(),title:String(body.title||'Sample photo').slice(0,80),photo_url:body.photoUrl,created_at:new Date().toISOString(),author_name:me.name};state.photos.unshift(photo);state.photos=state.photos.slice(0,12);return photo;}
  if(parts[0]==='photos'&&parts[1]&&method==='DELETE'){state.photos=state.photos.filter(p=>p.id!==parts[1]);return {};}
  if(parts[0]==='invitations')throw new DemoError(400,'Invitations are disabled in the public demo. Everyone can use Open demo.');
  throw new DemoError(400,'This action is not available in the portfolio demo.');
 };
 return {state,request};
}
