"""Read-only column inventory; no workbook values, contacts or formulas are published."""
import argparse, hashlib, importlib.util, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('workbook_audit',ROOT/'tools/project-pilot/inspect_workbook.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
LIVE={'B':'รหัสโครงการ','C':'ชื่อโครงการ','E':'ผู้รับผิดชอบโครงการ','F':'ฝ่ายที่รับผิดชอบ','AI':'ผู้ตรวจเอกสาร'}
EDIT={'O':'งบอนุมัติ','U':'ทิศทางโอน','V':'ส่วนต่างโอน','AJ':'จำนวนเงินใช้จริง','H':'สถานะอนุมัติ','Q':'สถานะโอน','Y':'สถานะยืม','AZ':'สถานะปิด','BA':'สถานะฎีกา'}
CALC={'W':'งบสุทธิ','AE':'เงินยืม','BC':'ยอดรับเพิ่ม/คืน','BE':'งบใช้จริง','BF':'งบคงเหลือ','BG':'ร้อยละใช้จ่าย'}
BEFORE=set('A D S T AA AB AF AH AL AM AN AO AP AQ AR AS AT AU AV AW AX AY BB'.split())
HELPER=set('BM BN BP BQ BR BS BT BU BV BW BY BZ'.split())
LABELS={'V':'จำนวนเงินส่วนต่างการโอน','BC':'จำนวนเงินรับเพิ่ม/คืน','BT':'สูตรช่วยก่อนปรับงบ'}
def col(n):
 s=''
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def clean(s):return str(s or '').replace('|','／').replace('\n',' ').strip()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);parser.add_argument('--output',type=Path,default=ROOT/'docs/project-workbook-column-audit.md');args=parser.parse_args()
 before=module.sha256(args.source);book=module.read_workbook(args.source);sheet=next(s for s in book['sheets'] if s['name'].strip()=='ตารางสถานะ');cells=sheet['cells']
 rows=sorted({int(re.search(r'\d+$',ref)[0]) for ref in cells if re.fullmatch(r'B\d+',ref) and int(ref[1:])>2 and cells[ref].get('value')})
 inventory=[];counts={'ข้อมูลโครงการ':0,'ตารางอ้างอิง':0,'ช่องคั่น':0}
 for i in range(1,79):
  c=col(i);label=clean(cells.get(c+'2',{}).get('value')) or LABELS.get(c,'');filled=sum(cells.get(f'{c}{r}',{}).get('value') not in (None,'') for r in rows);formula=sum(bool(cells.get(f'{c}{r}',{}).get('hasFormula')) for r in rows)
  if c in HELPER:category='ตารางอ้างอิง';location='เบื้องหลัง';current='ยังไม่ย้ายตารางอ้างอิงครบ';plan='คงสูตร/ทะเบียนต้นทาง; ต้องออกแบบแหล่งข้อมูลก่อนย้าย'
  elif not label and not filled and not formula:category='ช่องคั่น';location='ไม่แสดง';current='ไม่ใช่ข้อมูล';plan='ไม่ต้องย้าย'
  else:
   category='ข้อมูลโครงการ';location='Modal รายละเอียด';plan='แสดง; ยังไม่เปิดเขียนจนมี validation และ audit'
   if c in EDIT:current='แก้ได้ในระบบจัดการ';plan='แก้ได้ตามสิทธิ์; ดูผลก่อนบันทึก'
   elif c in LIVE:current='อ่านจากระบบจัดการ';plan='แสดง; ไม่แก้ตัวตนหรือหน่วยงานจากฟอร์มยอดเงิน'
   elif c in CALC:current='คำนวณจากข้อมูลระบบจัดการ';plan='คำนวณอัตโนมัติ; ไม่ให้กรอกทับ'
   elif c=='AD':current='แสดงอัตราจาก formulaInputs.advanceRate (BR)';plan='ตรวจ AD เทียบ BR ก่อนเปิดแก้อัตรา'
   elif c in ['BJ','BK']:current='แสดงข้อมูลสรุปอ้างอิงจากหน้าสถานะ';plan='แยกจากสถานะที่แก้ได้ AZ/BA; ไม่เขียนทับจาก cache'
   else:current='แสดงจากหน้าสถานะ (อ่านอย่างเดียว)'
  counts[category]+=1
  inventory.append(f'| {c} | {label or "—"} | {filled} | {formula} | {category} | {current} | {plan} |')
 lines=['# ตรวจคอลัมน์ Excel เทียบระบบจัดการโครงการ','',f'ต้นฉบับ: `{args.source.name}`',f'SHA-256: `{before}`','',f'ตรวจ {len(rows)} โครงการในชีต “ตารางสถานะ” ครบ A–BZ จำนวน 78 คอลัมน์: ข้อมูลโครงการ {counts["ข้อมูลโครงการ"]} คอลัมน์, ตารางอ้างอิง {counts["ตารางอ้างอิง"]} คอลัมน์, ช่องคั่น {counts["ช่องคั่น"]} คอลัมน์.','',
 '## ผลที่ใช้ตัดสินใจ','',
 '- รวมงานเอกสารและผู้ลงนามเป็นแท็บในหน้าจัดการโครงการ โดยเก็บสิทธิ์เขียน appSettings ไว้ที่หัวหน้าสตาฟ และไม่ขยายสิทธิ์ API ปี 2568.',
 '- เพิ่มการแสดงไฟล์ วันที่ออกเอกสาร ผู้รับผิดชอบ เหรัญญิกโครงการ ประวัติติดตาม หมายเหตุ และวันที่ส่งปิดจากแหล่งเดียวกับหน้าสถานะ ไม่คัดลอกข้อมูลส่วนบุคคลจาก Excel ลง repo.',
 '- ไฟล์ D/T/AB แสดงลิงก์ได้เมื่อแหล่งสถานะส่ง URL จริงหรือ HTML hyperlink; ถ้าเป็น CSV ที่เหลือเพียงชื่อไฟล์ จะแสดงข้อความตามต้นทาง ไม่สร้าง URL ขึ้นเอง.',
 '- I/J/K เดิมรวมเป็นข้อความประชุม ตอนนี้แสดงแยกประกอบด้วย. แสดง BJ/BK แยกเป็นข้อมูลสรุปต้นทาง ไม่สับสนกับ AZ/BA ที่แก้ผ่านระบบ.',
 '- การเพิ่มช่องอ่านอย่างเดียวไม่ใช่การย้ายฐานข้อมูลครบ Excel; ช่องใหม่ยังไม่มี API บันทึก และไม่มีการเขียนไฟล์ต้นฉบับหรือข้อมูล production.',
 '- คอลัมน์ AD เป็นผลจาก BR ในต้นฉบับ แต่ระบบใช้ advanceRate จาก BR; ต้องรักษากติกาเดิมก่อนเปิดแก้.',
 '- สูตร Excel แบบ array/spill อาจเก็บ formula ไว้เพียงเซลล์หัวช่วง จำนวนสูตรในตารางนี้เป็นจำนวนเซลล์ที่เก็บ formula ไม่ใช่จำนวนเซลล์ผลลัพธ์.',
 '- อ่าน cached values และสูตรเท่านั้น ไม่ประมวลผล TODAY/IMPORTRANGE/QUERY หรือสั่ง refresh แหล่งภายนอก จึงไม่อ้างว่าค่า cached เป็นปัจจุบัน.',
 '', '## ตารางครบทุกคอลัมน์','', '| Excel | ชื่อคอลัมน์ | มีค่าในแถวโครงการ | เซลล์สูตร | ประเภท | รองรับหลังปรับ | แนวทาง |','|---|---|---:|---:|---|---|---|',*inventory,'','## ชีตอื่น','', '| ชีต | บทบาทและแนวทาง |','|---|---|',
 '| CONTACT | ทะเบียนผู้ติดต่อ แยกจากผู้ลงนามรายปี; ยังไม่ได้ย้ายหรือเผยแพร่ข้อมูลติดต่อ |',
 '| ตรวจสอบงานผู้ช่วยเหรัญญิก | รายงาน/สูตรติดตามงาน แยกจากข้อมูลโครงการหลัก; ไม่ย้ายเป็นช่องแก้ไข |',
 '| ประธาน 4 ฝ่าย ติดตามการส่งเอกสา | รายงานดึงข้อมูลภายนอก; ยังไม่ย้ายหรือรันสูตร |','',
 '## งานถัดไปก่อนเปิดแก้ครบ Excel','',
 '1. ออกแบบ schema ข้อมูลเอกสาร วันกำหนดการ และประวัติติดตาม พร้อมชนิดข้อมูลและสิทธิ์.',
 '2. เพิ่ม API ที่ตรวจ version, preview, audit และการสำรอง; แยกยอดสูตรออกจากข้อมูลกรอก.',
 '3. นำเข้าข้อมูลเพิ่มแบบ migration ที่ตรวจปี/รหัสโครงการและความสอดคล้องกับชุดใช้งานจริง; ห้ามคัดลอก cached สูตรทับยอดล่าสุด.',
 '4. ทดสอบด้วย emulator และข้อมูลจำลองก่อนเผยแพร่.','']
 if module.sha256(args.source)!=before:raise RuntimeError('Source changed while reading')
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text('\n'.join(lines),encoding='utf-8')
 print({'projects':len(rows),'columns':78,**counts,'sourceUnchanged':True,'report':str(args.output)})
if __name__=='__main__':main()
