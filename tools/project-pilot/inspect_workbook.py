"""Read-only XLSX audit using Python's standard library. Never executes formulas.

Usage: python3 tools/project-pilot/inspect_workbook.py /path/to/source.xlsx
Private extracted data is written to a mode-0700 temporary directory outside the repo.
"""
import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import posixpath
import re
import tempfile
import zipfile
import xml.etree.ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
MONEY = {'O': 'งบอนุมัติ', 'V': 'ส่วนต่างโอนงบ', 'W': 'งบสุทธิ', 'AE': 'เงินยืมรองจ่าย',
         'AJ': 'เงินใช้จริงที่กรอก', 'BC': 'ยอดคืนหรือเบิกเพิ่ม', 'BE': 'งบใช้จริง', 'BF': 'งบคงเหลือ'}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS):
                strings.append(''.join(node.text or '' for node in item.iterfind('.//s:t', NS)))
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        relationships = {r.attrib['Id']: r.attrib for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = []
        for sheet in workbook.findall('s:sheets/s:sheet', NS):
            rel = relationships[sheet.attrib[REL]]
            if rel.get('TargetMode') == 'External':
                raise ValueError('External worksheet relationship is not supported')
            target = rel['Target']
            member = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl', target))
            root = ET.fromstring(archive.read(member))
            cells = {}
            for node in root.findall('s:sheetData/s:row/s:c', NS):
                raw = node.find('s:v', NS)
                formula = node.find('s:f', NS)
                raw_value = raw.text if raw is not None else None
                cell_type = node.get('t', 'n')
                value = raw_value
                if cell_type == 's' and raw_value is not None:
                    value = strings[int(raw_value)]
                elif cell_type == 'inlineStr':
                    value = ''.join(t.text or '' for t in node.findall('s:is//s:t', NS))
                cells[node.attrib['r']] = {
                    'type': cell_type, 'value': value, 'rawValue': raw_value,
                    'style': node.get('s'), 'hasFormula': formula is not None,
                    'formula': formula.text if formula is not None else None,
                    'formulaAttributes': dict(formula.attrib) if formula is not None else {},
                }
            validations = [
                {'range': v.get('sqref'), 'type': v.get('type'),
                 'formula1': v.findtext('s:formula1', default='', namespaces=NS)}
                for v in root.findall('s:dataValidations/s:dataValidation', NS)
            ]
            sheets.append({'name': sheet.attrib['name'], 'state': sheet.get('state', 'visible'), 'cells': cells, 'validations': validations})
        props = workbook.find('s:workbookPr', NS)
        return {'date1904': props is not None and props.get('date1904') in ('1', 'true'),
                'sheets': sheets, 'externalLinkParts': len([n for n in archive.namelist() if re.fullmatch(r'xl/externalLinks/externalLink\d+\.xml', n)]),
                'numberFormatsXml': archive.read('xl/styles.xml').decode('utf-8') if 'xl/styles.xml' in archive.namelist() else None}


def summarize(book):
    summary = {'sheets': [], 'formulaFunctionCounts': {}, 'externalLinkParts': book['externalLinkParts'],
               'note': 'Cached values only. No formula recalculation or live external-data refresh performed.'}
    functions = Counter()
    for sheet in book['sheets']:
        cells = sheet['cells']
        formula_cells = [(ref, c) for ref, c in cells.items() if c['hasFormula']]
        for _, cell in formula_cells:
            functions.update(re.findall(r'([A-Za-z_][A-Za-z0-9_.]*)\s*\(', cell['formula'] or ''))
        summary['sheets'].append({
            'name': sheet['name'], 'populatedCells': sum(c['value'] not in (None, '') or c['hasFormula'] for c in cells.values()),
            'formulaCells': len(formula_cells), 'formulasWithoutCachedValue': sum(c['value'] in (None, '') for _, c in formula_cells),
            'errorCells': [ref for ref, c in cells.items() if c['type'] == 'e'], 'validationRules': len(sheet['validations'])
        })
    summary['formulaFunctionCounts'] = dict(functions.most_common())
    main = next((s for s in book['sheets'] if s['name'].strip() == 'ตารางสถานะ'), None)
    if main is None:
        summary['blocker'] = 'Expected worksheet ตารางสถานะ not found. Do not import.'
        return summary, []
    cells = main['cells']
    row_numbers = sorted({int(re.search(r'\d+$', ref).group()) for ref in cells})
    records, missing_codes = [], []
    for row in row_numbers:
        if row <= 2:
            continue
        code = cells.get(f'B{row}', {}).get('value')
        name = cells.get(f'C{row}', {}).get('value')
        if not code and not name:
            continue
        if not code:
            missing_codes.append(row)
        row_cells = {re.sub(r'\d+$', '', ref): c for ref, c in cells.items() if re.search(r'\d+$', ref).group() == str(row)}
        records.append({'sourceRow': row, 'year': 2568, 'projectCode': code, 'projectName': name, 'sourceCells': row_cells})
    codes = Counter(r['projectCode'] for r in records if r['projectCode'])
    summary['projectRecords'] = len(records)
    summary['uniqueProjectCodes'] = len(codes)
    summary['duplicateCodeGroups'] = sum(n > 1 for n in codes.values())
    summary['duplicateCodeRows'] = [r['sourceRow'] for r in records if codes[r['projectCode']] > 1]
    summary['missingCodeRows'] = missing_codes
    summary['money'] = {}
    for col, label in MONEY.items():
        stats = {'label': label, 'numericCells': 0, 'blankCells': 0, 'formulaCells': 0, 'invalidCells': [],
                 'negativeCells': [], 'subSatangCells': [], 'cachedTotalBaht': '0'}
        total = Decimal(0)
        for record in records:
            c = record['sourceCells'].get(col, {})
            ref = f"{col}{record['sourceRow']}"
            if c.get('hasFormula'):
                stats['formulaCells'] += 1
            value = c.get('value')
            if value in (None, ''):
                stats['blankCells'] += 1
                continue
            try:
                if c.get('type', 'n') != 'n':
                    raise InvalidOperation
                amount = Decimal(value)
                if not amount.is_finite():
                    raise InvalidOperation
            except InvalidOperation:
                stats['invalidCells'].append(ref)
                continue
            total += amount
            stats['numericCells'] += 1
            if amount < 0:
                stats['negativeCells'].append(ref)
            if amount * 100 != (amount * 100).to_integral_value():
                stats['subSatangCells'].append(ref)
        stats['cachedTotalBaht'] = str(total)
        summary['money'][col] = stats
    summary['headers'] = {col: {str(row): cells.get(f'{col}{row}', {}).get('value') for row in (1, 2)}
                          for col in ['B', 'C', 'H', 'Q', 'Y', 'AZ', 'BA', *MONEY]}
    return summary, records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    before = sha256(args.source)
    book = read_workbook(args.source)
    summary, records = summarize(book)
    after = sha256(args.source)
    if before != after:
        raise RuntimeError('Source file changed during inspection; discard this extraction and retry.')
    destination = Path(tempfile.mkdtemp(prefix='sgcu-year68-audit-'))
    summary.update({'sourceFile': args.source.name, 'sourceSha256': before, 'sourceUnchanged': True,
                    'readyForProduction': False, 'outputDirectory': str(destination)})
    for name, value in [('workbook-extracted.json', book), ('project-records.json', records), ('summary.json', summary)]:
        target = destination / name
        target.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        target.chmod(0o600)
    # Report counts only; full source data and financial totals remain in private output files.
    print(json.dumps({k: summary.get(k) for k in ['outputDirectory', 'sourceUnchanged', 'projectRecords', 'uniqueProjectCodes', 'duplicateCodeGroups', 'missingCodeRows', 'sheets', 'formulaFunctionCounts', 'blocker']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
