/* Shared navigation only; project API and signer write permissions remain independent. */
(function(){
 const root=document.querySelector('[data-page="project-live-staff"].page-view');if(!root)return;
 const tabs=[...root.querySelectorAll('[data-project-hub-tab]')];let selected='projects';
 const canUseProjects=()=>['6534324223@student.chula.ac.th','tuwanon.kimchiang@gmail.com'].includes((window.sgcuAuth?.auth?.currentUser?.email||'').toLowerCase()) && globalThis.SGCU_APP_CONFIG?.projectLive?.enabled!==false;
 const canEditDocuments=()=>typeof isHeadStaffProfile==='function' && typeof staffAuthUser!=='undefined' && isHeadStaffProfile(staffAuthUser);
 function select(name,notify=true){
  selected=name==='projects'&&!canUseProjects()?'documents':name;
  for(const tab of tabs){const active=tab.dataset.projectHubTab===selected;tab.hidden=tab.dataset.projectHubTab==='projects'&&!canUseProjects();tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  for(const panel of root.querySelectorAll('[data-project-hub-panel]'))panel.hidden=panel.dataset.projectHubPanel!==selected;
  if(notify)window.dispatchEvent(new CustomEvent('sgcu:project-hub-tab',{detail:{tab:selected}}));
 }
 tabs.forEach(tab=>{tab.onclick=()=>select(tab.dataset.projectHubTab);tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const visible=tabs.filter(t=>!t.hidden),index=visible.indexOf(tab);const next=e.key==='Home'?visible[0]:e.key==='End'?visible.at(-1):visible[(index+(e.key==='ArrowRight'?1:visible.length-1))%visible.length];select(next.dataset.projectHubTab);next.focus();};});
 window.sgcuProjectHub={canUseProjects,canEditDocuments,get selected(){return selected;},select};
 window.addEventListener('sgcu:page-active',e=>{if(e.detail?.page==='project-live-staff'){select(selected,false);window.sgcuDocumentSigners?.refreshPermissions?.();}});
 window.sgcuAuth?.onAuthStateChanged(window.sgcuAuth.auth,()=>select(selected,false));select(selected,false);
})();
