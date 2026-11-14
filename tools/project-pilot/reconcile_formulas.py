"""Reconcile known year-68 monetary formulas against saved XLSX values.

This is an explicit implementation of inspected formulas, not an Excel interpreter.
External data is checked only against the snapshot embedded in the workbook.
"""
import argparse
import ast
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP, localcontext
import json
import html
from pathlib import Path
import re
import tempfile

from inspect_workbook import MONEY, sha256

D = Decimal
CENT = D('0.01')
TOLERANCE = D('0.0000001')  # Only for matching saved binary-floating-point formula results.
TRANSFER_ACTIVE = {'อนุมัติการโอนงบประมาณโดยเหรัญญิก', 'ผ่านที่ประชุมสภาใหญ่', 'รอนายกและประธานสภาลงนาม', 'ส่งกิจการนิสิตแล้ว รออนุมัติ', 'กระบวนการโอนงบประมาณมีผลบังคับใช้'}
ADVANCE_RECEIVED = {'โครงการรับเงินแล้ว', 'เหรัญญิกรับเงินจากกิจการนิสิต', 'ส่งกิจการนิสิตแล้ว รออนุมัติ'}
EXPECTED = {
    'W3': 'IF(V3:V554="","",IFS(U3:U554="ลด",O3:O554-V3:V554,U3:U554="เพิ่ม",O3:O554+V3:V554))',
    'AD3': 'IF((H3:H554="อนุมัติโครงการ")+(Z3:Z554<>""),BR3:BR554,"")',
    'AE3': 'IF((H3:H554="อนุมัติโครงการ")+(Z3:Z554<>""),O3:O554*AD3:AD554/100,"")',
    'BB3': 'IFS(BA3:BA554="","",BC3:BC554=0,"",BC3:BC554<0,"คืน",BC3:BC554>0,"เบิก")',
    'BC3': 'IF(Y3:Y554="","",IF((Y3:Y554="โครงการรับเงินแล้ว")+(Y3:Y554="เหรัญญิกรับเงินจากกิจการนิสิต")+(Y3:Y554="ส่งกิจการนิสิตแล้ว รออนุมัติ"),AJ3:AJ554-AE3:AE554,AJ3:AJ554))',
    'BE3': 'IF(AJ3:AJ554<>"",AJ3:AJ554,0)',
    'BF3': 'IF(AJ3:AJ554="",0,IF((Q3:Q554="อนุมัติการโอนงบประมาณโดยเหรัญญิก")+(Q3:Q554="ผ่านที่ประชุมสภาใหญ่")+(Q3:Q554="รอนายกและประธานสภาลงนาม")+(Q3:Q554="ส่งกิจการนิสิตแล้ว รออนุมัติ")+(Q3:Q554="กระบวนการโอนงบประมาณมีผลบังคับใช้"),W3:W554-BE3:BE554,O3:O554-BE3:BE554))',
    'BG3': 'IFERROR(IF(W3:W554="",IF(O3:O554<>0,BE3:BE554/O3:O554,0),BE3:BE554/W3:W554),0)',
    'BR3': 'IF(BS3:BS554="",BU3:BU554,BS3:BS554)',
    'BT3': 'IF(AD3:AD554="","",IF(ISNUMBER(MATCH(Y3:Y554,{"สำรองจ่ายก่อน","โครงการรับเงินแล้ว","เหรัญญิกรับเงินจากกิจการนิสิต","ส่งกิจการนิสิตแล้ว รออนุมัติ"},0)),AD3:AD554,""))',
    'BU3': 'IF(E3:E554="","",_xlfn.XLOOKUP(E3:E554,BV3:BV554,BW3:BW554,80))',
}


def canonical(formula):
    # Ignore whitespace only outside string literals.
    return ''.join(part if part.startswith('"') else re.sub(r'\s+', '', part)
                   for part in re.split(r'("(?:[^"]|"")*")', formula or ''))


def value(cell):
    raw = cell.get('value')
    if raw in (None, ''):
        return None
    if cell.get('type') == 'e':
        raise ValueError('Source cell contains an error')
    if cell.get('type', 'n') == 'n':
        number = D(raw)
        if not number.is_finite():
            raise ValueError('Nonfinite number')
        return number
    return raw


def number(v):
    if v is None:
        return D(0)  # Excel arithmetic coercion only; do not replace source blanks.
    if not isinstance(v, D):
        raise ValueError('Expected a numeric formula operand')
    return v


def rounded(v):
    return None if v is None else number(v).quantize(CENT, rounding=ROUND_HALF_UP)


def arithmetic(formula):
    """Only literal arithmetic, no eval, names, calls, cell references or attributes."""
    tree = ast.parse(formula, mode='eval')

    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return D(ast.get_source_segment(formula, node))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            return visit(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            return left / right
        raise ValueError('Unsupported input formula; manual verification needed')
    return visit(tree)


def calculate(inputs, lookup, two_decimals=False, dash_means_missing_document=False):
    get = lambda key: inputs.get(key)
    money = rounded if two_decimals else lambda v: v
    o, v, aj = (money(get(key)) for key in ('O', 'V', 'AJ'))
    result = {'O': o, 'V': v, 'AJ': aj}
    bu = None if get('E') is None else lookup.get(get('E'), D(80))
    br = bu if get('BS') is None else get('BS')
    has_document = get('Z') is not None and not (dash_means_missing_document and get('Z') == '-')
    eligible = get('H') == 'อนุมัติโครงการ' or has_document
    ad = br if eligible else None
    ae = money(number(o) * number(ad) / 100) if eligible else None
    if v is None:
        w = None
    elif get('U') == 'ลด':
        w = money(number(o) - number(v))
    elif get('U') == 'เพิ่ม':
        w = money(number(o) + number(v))
    else:
        raise ValueError('Transfer amount present but direction is not ลด/เพิ่ม')
    be = money(number(aj))
    bc = None if get('Y') is None else money(number(aj) - number(ae)) if get('Y') in ADVANCE_RECEIVED else money(number(aj))
    bf = D(0) if aj is None else money((number(w) if get('Q') in TRANSFER_ACTIVE else number(o)) - be)
    base = number(o) if w is None else number(w)
    bg = be / base if base else D(0)
    bb = None if get('BA') is None or number(bc) == 0 else 'คืน' if number(bc) < 0 else 'เบิก'
    bt = ad if ad is not None and get('Y') in ADVANCE_RECEIVED | {'สำรองจ่ายก่อน'} else None
    result.update({'BU': bu, 'BR': br, 'AD': ad, 'AE': ae, 'W': w, 'BE': be, 'BC': bc, 'BF': bf, 'BG': bg, 'BB': bb, 'BT': bt})
    return result


def matches(a, b, tolerance=TOLERANCE):
    if isinstance(a, D) and isinstance(b, D):
        return abs(a - b) <= tolerance
    return a == b


def reconcile(book, records):
    cells = next(s['cells'] for s in book['sheets'] if s['name'] == 'ตารางสถานะ')
    guards = [ref for ref, expr in EXPECTED.items() if canonical(cells.get(ref, {}).get('formula')) != canonical(expr)]
    if guards:
        raise ValueError('Formula signatures differ: ' + ', '.join(guards))
    lookup = {}
    duplicate_lookup = []
    for row in range(3, 555):
        key = value(cells.get(f'BV{row}', {}))
        if key is not None:
            if key in lookup:
                duplicate_lookup.append(row)
            else:
                lookup[key] = value(cells.get(f'BW{row}', {}))
    report = {'projects': len(records), 'formulaSignaturesVerified': len(EXPECTED),
              'localChecks': 0, 'localMismatches': [], 'blockedRows': [], 'roundingDifferences': [],
              'literalFormulaChecks': 0, 'lookupDuplicateRows': duplicate_lookup,
              'dashHypothesis': {'adopted': False, 'description': 'Diagnostic only: treat Z="-" as missing loan document', 'localMismatches': [], 'roundingDifferences': []},
              'externalDataFreshnessVerified': False, 'readyForProduction': False,
              'policy': 'ROUND_HALF_UP on each monetary input and each derived monetary result; percentages retain their original precision',
              'snapshotDependency': 'BV/BW organization-rate lookup and Z loan document existence are workbook snapshots, not refreshed external sources'}
    totals = {col: {'source': D(0), 'roundedCache': D(0), 'recalculated': D(0), 'hypothesisCalculated': D(0), 'blankSource': 0, 'blankCalculated': 0} for col in MONEY}
    details = []
    for record in records:
        row = record['sourceRow']
        try:
            inputs = {col: value(cell) for col, cell in record['sourceCells'].items()}
            for col in ('O', 'V', 'AJ'):
                cell = record['sourceCells'].get(col, {})
                if cell.get('hasFormula'):
                    expected = arithmetic(cell['formula'])
                    report['literalFormulaChecks'] += 1
                    if not matches(expected, inputs.get(col)):
                        report['localMismatches'].append({'cell': f'{col}{row}', 'source': inputs.get(col), 'calculated': expected})
                    inputs[col] = expected
            original = calculate(inputs, lookup)
            candidate = calculate(inputs, lookup, two_decimals=True)
            hypothesis = calculate(inputs, lookup, dash_means_missing_document=True)
            hypothesis_rounded = calculate(inputs, lookup, two_decimals=True, dash_means_missing_document=True)
            for col, expected in original.items():
                if col in ('O', 'V', 'AJ'):
                    continue
                saved = value(record['sourceCells'].get(col, {}))
                report['localChecks'] += 1
                if not matches(expected, saved):
                    report['localMismatches'].append({'cell': f'{col}{row}', 'source': saved, 'calculated': expected})
                if not matches(hypothesis[col], saved):
                    report['dashHypothesis']['localMismatches'].append({'cell': f'{col}{row}', 'source': saved, 'calculated': hypothesis[col]})
            for col in MONEY:
                saved = value(record['sourceCells'].get(col, {}))
                result = candidate[col]
                normalized = rounded(saved)
                totals[col]['source'] += number(saved)
                totals[col]['roundedCache'] += number(normalized)
                totals[col]['recalculated'] += number(result)
                totals[col]['hypothesisCalculated'] += number(hypothesis_rounded[col])
                totals[col]['blankSource'] += saved is None
                totals[col]['blankCalculated'] += result is None
                if not matches(normalized, result, D(0)):
                    report['roundingDifferences'].append({'cell': f'{col}{row}', 'source': saved, 'roundedSaved': normalized,
                                                         'recalculated': result, 'difference': number(result) - number(normalized)})
                if not matches(normalized, hypothesis_rounded[col], D(0)):
                    report['dashHypothesis']['roundingDifferences'].append({'cell': f'{col}{row}', 'source': saved, 'roundedSaved': normalized, 'recalculated': hypothesis_rounded[col]})
            details.append({'sourceRow': row, 'projectCode': record['projectCode'], 'legacyCalculated': original, 'candidateCalculated': candidate})
        except (ValueError, ArithmeticError, SyntaxError) as error:
            report['blockedRows'].append({'sourceRow': row, 'reason': str(error)})
    report['totals'] = totals
    report['roundingAffectedProjects'] = len({re.search(r'\d+$', c['cell']).group() for c in report['roundingDifferences']})
    report['localMismatchProjects'] = len({re.search(r'\d+$', c['cell']).group() for c in report['localMismatches']})
    report['localMismatchesByColumn'] = dict(Counter(re.sub(r'\d+$', '', c['cell']) for c in report['localMismatches']))
    report['roundingDifferencesByColumn'] = dict(Counter(re.sub(r'\d+$', '', c['cell']) for c in report['roundingDifferences']))
    return report, details


def render_report(report, records, details):
    esc = lambda v: html.escape(str(v))
    detail_by_row = {item['sourceRow']: item for item in details}
    affected = {int(re.search(r'\d+$', item['cell']).group()) for item in report['localMismatches']}
    rows = []
    for record in records:
        row = record['sourceRow']
        if row not in affected:
            continue
        c = record['sourceCells']
        cells = [row, record['projectCode'], record['projectName'], c.get('H', {}).get('value'),
                 c.get('Z', {}).get('value'), c.get('AE', {}).get('value') or 'ว่าง',
                 detail_by_row[row]['legacyCalculated']['AE']]
        rows.append('<tr>' + ''.join(f'<td>{esc(v)}</td>' for v in cells) + '</tr>')
    totals = ''.join('<tr>' + ''.join(f'<td>{esc(v)}</td>' for v in [col, MONEY[col], format(t['roundedCache'], '.2f'), format(t['hypothesisCalculated'], '.2f')]) + '</tr>'
                     for col, t in report['totals'].items())
    return f'''<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ผลตรวจสูตรปี 68</title><style>body{{font:16px/1.7 system-ui,sans-serif;margin:32px;color:#25202a}}main{{max-width:1200px;margin:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border:1px solid #ddd;padding:8px;text-align:left}}th{{background:#f7eaf0}}.note{{background:#fff2d7;padding:16px}}.scroll{{overflow:auto}}h1,h2{{color:#8b2654}}</style><main>
<h1>ผลตรวจสูตรและยอดเงิน ปี 68</h1><p>ตรวจ {report['projects']} โครงการ · สูตรหลัก {report['formulaSignaturesVerified']} ชุด · เปรียบเทียบรายช่อง {report['localChecks']:,} ครั้ง และสูตรบวกเลขตั้งต้น {report['literalFormulaChecks']} ช่อง</p>
<p class="note">ไฟล์ต้นฉบับไม่เปลี่ยน ยังไม่ได้นำเข้าฐานข้อมูลจริง และยังไม่เปลี่ยนสูตรธุรกิจตามสมมติฐานด้านล่าง ข้อมูลภายนอกใช้เฉพาะค่าที่บันทึกมากับไฟล์ ไม่ได้ยืนยันความสดจาก Sheets ต้นทาง</p>
<h2>ประเด็นที่พบ</h2><p>พบ {len(report['localMismatches'])} ช่องใน {report['localMismatchProjects']} โครงการที่สูตรตามตัวอักษรไม่ตรงกับค่าที่บันทึกไว้ โดยอยู่ที่ AD (ร้อยละยืม), AE (เงินยืม) และ BT (ตัวช่วยร้อยละ) สูตรใช้เงื่อนไข Z ไม่ว่าง แต่ Z มีเครื่องหมายขีด (-) แทนไม่มีเอกสาร</p>
<p>หากทดลองตีความ Z = “-” ว่าไม่มีเอกสาร พบความต่างของสูตรท้องถิ่นเหลือ {len(report['dashHypothesis']['localMismatches'])} ช่อง และผลปัดเงิน 2 ตำแหน่งคำนวณต่อเนื่องต่างจากค่าบันทึกที่ปัด 2 ตำแหน่ง {len(report['dashHypothesis']['roundingDifferences'])} ช่อง นี่เป็นผลทดสอบสมมติฐาน ไม่ใช่การยืนยันหรือแก้สูตรจริง</p>
<h2>ยอดรวมเปรียบเทียบภายใต้สมมติฐานข้างต้น</h2><p>ปัด ROUND_HALF_UP รายช่องเงิน ไม่ปัดร้อยละ ช่องว่างยังคงว่าง ไม่ได้นับเป็นข้อมูลศูนย์ แม้ยอดรวมจะบวกรวมเฉพาะค่าตัวเลข</p><div class="scroll"><table><thead><tr><th>คอลัมน์</th><th>รายการ</th><th>รวมค่าบันทึกหลังปัด 2 ตำแหน่ง</th><th>รวมคำนวณใหม่เมื่อถือ - ว่าไม่มีเอกสาร</th></tr></thead><tbody>{totals}</tbody></table></div>
<h2>รายการที่ต้องตรวจเงื่อนไขเลขเอกสาร</h2><p>คอลัมน์สุดท้ายเป็นผลตีความสูตรตามตัวอักษร แสดงเพื่ออธิบายความต่าง ห้ามนำไปแทนยอดเงินจริงโดยอัตโนมัติ</p><div class="scroll"><table><thead><tr><th>แถว</th><th>รหัส</th><th>โครงการ</th><th>H</th><th>Z</th><th>AE บันทึกไว้</th><th>AE ตามสูตรตัวอักษร</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<h2>ขอบเขตที่ยังไม่ผ่านการยืนยัน</h2><p>ยังไม่ได้ตรวจสูตรทุกช่องของทุกชีต เช่น ข้อความติดตาม วันครบกำหนด และสูตร IMPORTRANGE กับแหล่งข้อมูลสด รายงานนี้ครอบคลุมสูตรเงินหลักและร้อยละที่พึ่งพากันเท่านั้น และไม่ใช่หลักฐานว่าเว็บจริงหรือการสำรองข้อมูลพร้อมใช้งาน</p></main></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audit_directory', type=Path)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    original_summary = json.loads((args.audit_directory / 'summary.json').read_text())
    if sha256(args.source) != original_summary['sourceSha256']:
        raise ValueError('Source changed since extraction. Re-extract before reconciling.')
    book = json.loads((args.audit_directory / 'workbook-extracted.json').read_text())
    records = json.loads((args.audit_directory / 'project-records.json').read_text())
    with localcontext() as context:
        context.prec = 50
        report, details = reconcile(book, records)
    report['sourceUnchanged'] = sha256(args.source) == original_summary['sourceSha256']
    destination = Path(tempfile.mkdtemp(prefix='sgcu-year68-formulas-'))
    for name, data in [('formula-report.json', report), ('project-reconciliation.json', details)]:
        path = destination / name
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str))
        path.chmod(0o600)
    page = destination / 'report.html'
    page.write_text(render_report(report, records, details), encoding='utf-8')
    page.chmod(0o600)
    output = {key: report[key] for key in ['projects', 'formulaSignaturesVerified', 'localChecks', 'literalFormulaChecks', 'blockedRows', 'localMismatchProjects', 'localMismatchesByColumn', 'roundingAffectedProjects', 'roundingDifferencesByColumn', 'sourceUnchanged']}
    output['outputDirectory'] = str(destination)
    output['dashHypothesis'] = report['dashHypothesis']
    print(json.dumps(output, ensure_ascii=False, indent=2, default=str))


if __name__ == '__main__':
    main()
