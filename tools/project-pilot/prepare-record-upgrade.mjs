// Read-only preparation. Outputs private files; never activates a dataset or grants access.
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateLiveBackup} from '../../functions/project-live/live-store.mjs';
import {seedRecord,calculateRecord} from '../../functions/project-live/record-model.mjs';
import {RECORD_FIELDS} from '../../functions/project-live/record-policy.mjs';
const [backupPath,fieldsPath,registryPath]=process.argv.slice(2);
if(!backupPath||!fieldsPath||!registryPath)throw Error('Usage: node prepare-record-upgrade.mjs legacy-backup.json source-fields.json registry.json (read-only; outputs /tmp). source-fields.json: {PROJECT68:id:{column:value,...,legacyFollowups:[{column,value}]}}. registry.json: {users:{uid:{id,role,name}},assignments:{projectId:assistantUid}}. Dates must be ISO Gregorian; money comes from latest backup.');
const [backupBytes,fieldBytes,registryBytes]=await Promise.all([backupPath,fieldsPath,registryPath].map(path=>readFile(path))),backup=JSON.parse(backupBytes),legacy=validateLiveBackup(backup),source=JSON.parse(fieldBytes),registry=JSON.parse(registryBytes),users=registry.users;
for(const [id,user]of Object.entries(legacy.users))if(JSON.stringify(users[id])!==JSON.stringify(user))throw Error('Existing historical accounts must be preserved exactly');
if(Object.values(users).filter(u=>u.role==='head').length!==1||Object.entries(users).some(([id,u])=>u.id!==id||!['head','admin','secretary','assistant'].includes(u.role)||typeof u.name!=='string'))throw Error('Invalid trusted account registry');
const records=[],changes=[];const liveCols=new Set(['B','C','E','F','H','O','Q','U','V','Y','AI','AJ','AZ','BA']);
for(const state of legacy.checkpoints){const p=state.data.projects[0],fields=source[p.id];if(!fields)throw Error('Missing source metadata for '+p.id);if(!Array.isArray(fields.legacyFollowups)||!fields.referenceFields||!['BH','BI','BJ','BK'].every(col=>Object.hasOwn(fields.referenceFields,col)))throw Error('Missing original followup/reference metadata for '+p.id);for(const f of RECORD_FIELDS)if(!liveCols.has(f.column)&&!Object.hasOwn(fields,f.column))throw Error('Missing field '+p.id+':'+f.column);
 const assignment=registry.assignments?.[p.id]||'';if(assignment&&users[assignment]?.role!=='assistant')throw Error('Unverified assistant mapping');
 const record=seedRecord(p,{...fields,AI:assignment},users);for(const event of state.audit)for(const col of ['H','Q','Y','AZ','BA'])if(event.beforeStatuses&&event.afterStatuses&&['status','approve'].includes(event.action)&&event.beforeStatuses[col]!==event.afterStatuses[col])record.statusEditors[col]=[...new Set([...(record.statusEditors[col]||[]),event.actor])];
 records.push(record);const next=calculateRecord(record.fields);for(const col of Object.keys(next.money))if(next.money[col]!==p.money[col])changes.push({projectId:p.id,code:p.code,column:col,before:p.money[col],after:next.money[col]});
}
if(Object.keys(source).length!==records.length)throw Error('Unexpected or duplicate project metadata');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),directory=await mkdtemp(join(tmpdir(),'sgcu-record-upgrade-'));
const manifest={schemaVersion:2,active:false,writesPerformed:false,projectCount:records.length,legacyChecksum:backup.checksum,metadataSha256:hash(fieldBytes),registrySha256:hash(registryBytes),formulaChanges:changes,unassignedProjects:records.filter(p=>!p.assigneeUid).map(p=>p.id),preparedAt:new Date().toISOString()};
await writeFile(join(directory,'records.json'),JSON.stringify({records,users,sourceChecksum:backup.checksum}),{mode:0o600});await writeFile(join(directory,'review.json'),JSON.stringify(manifest,null,2),{mode:0o600});await writeFile(join(directory,'legacy-backup.json'),backupBytes,{mode:0o600});console.log(JSON.stringify({directory,projectCount:records.length,formulaChangeCount:changes.length,active:false,writesPerformed:false}));
