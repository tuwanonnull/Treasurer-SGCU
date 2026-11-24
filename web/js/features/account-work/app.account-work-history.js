/* One-shot, cursor-paged history. Never subscribes or writes to service records. */
(() => {
  const PAGE_SIZE = 20;
  // Bound scans for derived terminal states (expired bookings/access), even on busy collections.
  const MAX_QUERIES_PER_PAGE = 12;
  const codeFields = {budget:['requestNo','projectCodeGenerated'],borrow:['requestNo'],meeting:['requestNo','bookingNo'],temporary:['requestNo'],representative:['requestNo']};
  const millis = value => value?.toMillis?.() ?? (value?.seconds !== undefined ? value.seconds * 1000 : value ? new Date(value).getTime() : NaN);
  const dateText = value => Number.isFinite(millis(value)) ? new Date(millis(value)).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}) : 'ไม่ระบุวันที่';
  const currentYear = () => {
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'numeric'}).formatToParts(new Date());
    const year = Number(parts.find(p=>p.type==='year').value), month = Number(parts.find(p=>p.type==='month').value);
    return year + 543 - (month < 6 ? 1 : 0);
  };
  const defaults = () => ({service:'all',status:'all',year:String(currentYear()),from:'',to:'',query:''});
  const context = () => window.sgcuWorkHistoryContext?.() || {state:{},definitions:[],allowedServices:[]};
  let version = 0, key = '', session = null;
  const compare = (a,b) => b.updatedMs - a.updatedMs || (a.service < b.service ? -1 : a.service > b.service ? 1 : a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0);
  function category(service,d,mode,now=Date.now()) {
    const status=String(d.status || '').toLowerCase();
    if (['true','1','yes','y'].includes(String(d.isDeleted).toLowerCase())) return null;
    if (service==='representative' && d.requestType!=='organization_representative') return null;
    if (status==='rejected') return d.cancelledByRequester ? 'cancelled' : 'rejected';
    if (status==='cancelled') return 'cancelled';
    if (service==='temporary') {
      if (status==='pending') return null;
      return d.active===false || millis(d.endsAt)<=now ? 'done' : null;
    }
    if (['returned','completed','no_show'].includes(status)) return 'done';
    if (status==='approved' && (service==='representative' || service==='budget' && mode==='staff')) return 'done';
    if (service==='meeting' && status==='approved' && Date.parse(`${d.date}T${d.endTime || '23:59'}:00+07:00`) < now) return 'done';
    return null;
  }
  function normalize(service,doc,mode,ctx) {
    const d=doc.data(), outcome=category(service,d,mode);
    if (!outcome) return null;
    const raw=String(d.status || '').toLowerCase();
    const status=outcome==='cancelled'?'ยกเลิกแล้ว':outcome==='rejected'?'ไม่อนุมัติ':raw==='no_show'?'ไม่มาใช้ห้อง':service==='meeting'?'สิ้นสุดการจอง':service==='borrow'?'คืนเรียบร้อย':service==='temporary'?(d.active===false?'ปิดสิทธิ์':'หมดอายุ'):'พิจารณาแล้ว';
    const orgValue=d.organizationName || d.projectDept || d.organization || d.requester?.organizationName;
    let org=String(typeof orgValue==='object' ? orgValue?.organizationName || orgValue?.name || 'ไม่ระบุหน่วยงาน' : orgValue || 'ไม่ระบุหน่วยงาน');
    if (service==='budget' && d.estimatedExpense!==undefined && Number.isFinite(Number(d.estimatedExpense))) org+=` · ${Number(d.estimatedExpense).toLocaleString('th-TH')} บาท`;
    const title=service==='meeting'?(ctx.roomName?.(d.roomId) || d.roomName || 'ห้องประชุม'):['temporary','representative'].includes(service)?(d.name || d.applicant?.displayName || d.applicant?.name || d.applicantName || d.applicantEmail || d.email):(d.projectName || d.borrowProjectName || (d.assets || []).map(a=>a.name).filter(Boolean).join(', '));
    return {id:`history-${mode}-${service}-${encodeURIComponent(doc.id)}`,recordId:doc.id,history:true,mode,service,title:String(title || 'รายการไม่ระบุชื่อ'),org,purpose:service==='meeting'?String(d.purpose || d.projectName || ''):'',requestNo:String(d.requestNo || d.projectCodeGenerated || d.bookingNo || ''),status,outcome,bucket:'done',due:null,badgeTone:outcome==='rejected'?'rejected':outcome==='cancelled' || raw==='no_show'?'warning':'approved',updatedMs:millis(d.updatedAt),deadline:'อัปเดต '+dateText(d.updatedAt),next:status,note:String(d.staffNote || d.reviewReason || d.rejectionReason || d.reason || ''),steps:[d.createdAt || d.requestedAt?'ยื่นคำขอ · '+dateText(d.createdAt || d.requestedAt):null,`${status} · อัปเดต ${dateText(d.updatedAt)}`].filter(Boolean)};
  }
  function bounds(filters) {
    let from=null,to=null;
    if (filters.year!=='all') {
      const year=Number(filters.year)-543;
      if (!Number.isInteger(year) || year<1900 || year>2200) throw Error('invalid-filter');
      from=new Date(`${year}-06-01T00:00:00+07:00`);to=new Date(`${year+1}-06-01T00:00:00+07:00`);
    }
    for (const [name,value] of [['from',filters.from],['to',filters.to]]) {
      if (!value) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('invalid-filter');
      const date=new Date(`${value}T00:00:00+07:00`);
      if (!Number.isFinite(+date)) throw Error('invalid-filter');
      if (name==='from') from=from && from>date?from:date;
      else {const end=new Date(+date+86400000);to=to && to<end?to:end;}
    }
    if (from && to && from>=to) throw Error('invalid-filter');
    return {from,to};
  }
  function statusValues(service,mode,filter) {
    let values=service==='budget'?['approved','rejected','cancelled']:service==='borrow'?['returned','completed','rejected','cancelled']:service==='meeting'?['approved','completed','no_show','rejected','cancelled']:['approved','rejected','cancelled'];
    if (service==='budget' && mode==='normal') values=values.filter(v=>v!=='approved');
    if (filter==='rejected') values=values.filter(v=>v==='rejected');
    if (filter==='cancelled') values=values.filter(v=>['cancelled','rejected'].includes(v));
    if (filter==='done') values=values.filter(v=>!['rejected','cancelled'].includes(v));
    return values;
  }
  function makeStreams(mode,filters,ctx) {
    const f=window.sgcuFirestore, collections=globalThis.SGCU_APP_CONFIG?.firestore?.collections || {}, range=bounds(filters), streams=[];
    if (!['all','done','rejected','cancelled'].includes(filters.status)) throw Error('invalid-filter');
    if (!ctx.state.isAuthenticated || !ctx.state.email) return streams;
    for (const [service,collection,page,ownerField] of ctx.definitions) {
      if (filters.service!=='all' && filters.service!==service) continue;
      if (mode==='staff' && !ctx.allowedServices.includes(service) || mode==='normal' && service==='representative') continue;
      const fields=filters.query?codeFields[service]:[null];
      for (const codeField of fields) {
        const constraints=[];
        if (mode==='normal') constraints.push(f.where(ownerField,'==',ctx.ownerEmail(service)));
        if (service!=='temporary') constraints.push(f.where('status','in',statusValues(service,mode,filters.status)));
        if (codeField) constraints.push(f.where(codeField,'==',filters.query));
        if (range.from) constraints.push(f.where('updatedAt','>=',range.from));
        if (range.to) constraints.push(f.where('updatedAt','<',range.to));
        constraints.push(f.orderBy('updatedAt','desc'),f.orderBy('__name__','asc'));
        streams.push({service,collection:collections[collection] || collection,constraints,buffer:[],cursor:null,done:false,ownerDocument:service==='temporary' && mode==='normal',range,codeField});
      }
    }
    return streams;
  }
  function emit(s=session) {
    if (!s || s!==session) return;
    window.sgcuWork?.setHistoryState({key:s.key,mode:s.mode,rows:[...s.rows],loading:s.loading,error:s.error,hasMore:s.streams.some(stream=>!stream.done || stream.buffer.length>0),started:true});
  }
  function resetAccess() {
    version++;key='';session=null;
    window.sgcuWork?.setHistoryState({key:'',rows:[],loading:false,error:'',hasMore:false,started:false});
  }
  async function configure(mode,filters,force=false) {
    const next={...defaults(),...filters,query:String(filters.query || '').trim()};
    const nextKey=JSON.stringify([mode,next]);
    if (!force && session && key===nextKey) return;
    version++; key=nextKey;
    const ctx=context();
    session={key,mode,filters:next,ctx,version,streams:[],rows:[],seen:new Set(),loading:false,error:'',pending:[]};
    try {session.streams=makeStreams(mode,next,ctx);} catch {session.error='กรุณาตรวจสอบปีและช่วงวันที่ที่เลือก';emit();return;}
    emit();
    if (ctx.state.isAuthenticated) await loadMore();
  }
  async function fill(stream,s,budget) {
    const f=window.sgcuFirestore;
    while (!stream.buffer.length && !stream.done) {
      if (!budget.remaining) return false;
      budget.remaining--;
      let docs;
      if (stream.ownerDocument) {
        const doc=await f.getDoc(f.doc(f.db,stream.collection,s.ctx.state.email));
        if (s!==session || s.version!==version) return false;
        docs=doc.exists()?[doc]:[];stream.done=true;
      } else {
        const cursor=stream.cursor?[f.startAfter(stream.cursor)]:[];
        const snap=await f.getDocs(f.query(f.collection(f.db,stream.collection),...stream.constraints,...cursor,f.limit(PAGE_SIZE)));
        if (s!==session || s.version!==version) return false;
        docs=snap.docs;stream.done=docs.length<PAGE_SIZE;
        if (docs.length) stream.cursor=docs.at(-1);
      }
      stream.buffer=docs.map(doc=>normalize(stream.service,doc,s.mode,s.ctx)).filter(row=>row && Number.isFinite(row.updatedMs) && (s.filters.status==='all' || row.outcome===s.filters.status) && (!stream.range.from || row.updatedMs>=+stream.range.from) && (!stream.range.to || row.updatedMs<+stream.range.to) && (!stream.ownerDocument || !s.filters.query || row.requestNo===s.filters.query));
    }
    return true;
  }
  async function loadMore() {
    const s=session;
    if (!s || s.loading || !s.ctx.state.isAuthenticated) return;
    s.loading=true;s.error='';emit(s);
    const budget={remaining:MAX_QUERIES_PER_PAGE};
    try {
      while (s.pending.length<PAGE_SIZE) {
        // Merge only once every stream has a head: never show older records ahead of unseen newer ones.
        let ready=true;
        for (const stream of s.streams) {if (!await fill(stream,s,budget)) {ready=false;break;}}
        if (s!==session || s.version!==version) return;
        if (!ready) break;
        const available=s.streams.filter(stream=>stream.buffer.length).sort((a,b)=>compare(a.buffer[0],b.buffer[0]));
        if (!available.length) break;
        const row=available[0].buffer.shift();
        if (!s.seen.has(row.id)) {s.seen.add(row.id);s.pending.push(row);}
      }
      s.rows.push(...s.pending);s.pending=[];
    } catch(error) {
      if (s!==session || s.version!==version) return;
      s.error=error.code==='failed-precondition'?'ประวัติยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลเพื่อตั้งค่าการค้นหา':error.code==='permission-denied'?'ไม่มีสิทธิ์อ่านประวัตินี้':'โหลดประวัติไม่สำเร็จ กรุณาลองอีกครั้ง';
      // Keep partially merged rows until retry succeeds, so errors cannot skip records.
    } finally {
      if (s===session && s.version===version) {s.loading=false;emit(s);}
    }
  }
  window.sgcuWorkHistory={defaults,currentYear,configure,loadMore,resetAccess};
})();
