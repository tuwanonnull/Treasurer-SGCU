"""Build a read-only local snapshot with the user-approved '-' document rule."""
import argparse
from decimal import localcontext
import json
from pathlib import Path
import tempfile

from inspect_workbook import MONEY, sha256
from reconcile_formulas import value, calculate, arithmetic, reconcile, D


def build(book, records):
    report, _ = reconcile(book, records)
    if report['blockedRows'] or report['dashHypothesis']['localMismatches'] or report['dashHypothesis']['roundingDifferences']:
        raise ValueError('Formula or rounded-value reconciliation failed; snapshot not built')
    cells = next(s['cells'] for s in book['sheets'] if s['name'] == 'ตารางสถานะ')
    lookup = {}
    for row in range(3, 555):
        key = value(cells.get(f'BV{row}', {}))
        if key is not None and key not in lookup:
            lookup[key] = value(cells.get(f'BW{row}', {}))
    projects = []
    seen = set()
    for record in records:
        if not record['projectCode'] or record['projectCode'] in seen:
            raise ValueError('Missing or duplicate project code')
        seen.add(record['projectCode'])
        inputs = {col: value(cell) for col, cell in record['sourceCells'].items()}
        for col in ('O', 'V', 'AJ'):
            cell = record['sourceCells'].get(col, {})
            if cell.get('hasFormula'):
                inputs[col] = arithmetic(cell['formula'])
        calculated = calculate(inputs, lookup, two_decimals=True, dash_means_missing_document=True)
        amounts = {}
        for col in MONEY:
            amount = calculated[col]
            cents = None if amount is None else int(amount * 100)
            if cents is not None and abs(cents) > 9007199254740991:
                raise ValueError('Amount exceeds JavaScript safe integer range')
            amounts[col] = cents
        projects.append({
            'id': f"YEAR68:{record['sourceRow']}:{record['projectCode']}", 'year': 2568,
            'sourceRow': record['sourceRow'], 'code': record['projectCode'], 'name': inputs.get('C') or '',
            'organization': inputs.get('E') or '', 'organizationGroup': inputs.get('F') or '',
            'responsibleName': inputs.get('AI') or '', 'responsibleColumn': 'AI', 'accountId': None,
            'statuses': {col: inputs.get(col) for col in ('H', 'Q', 'Y', 'AZ', 'BA')},
            'money': amounts,
            'formulaInputs': {
                'version': 1, 'transferDirection': inputs.get('U'),
                'hasLoanDocument': inputs.get('Z') not in (None, '-'),
                'advanceRate': None if calculated['BR'] is None else str(calculated['BR']),
            },
            'sourceMoney': {col: record['sourceCells'].get(col, {}).get('value') for col in MONEY},
        })
    totals = {col: sum(p['money'][col] or 0 for p in projects) for col in MONEY}
    if any(abs(total) > 9007199254740991 for total in totals.values()):
        raise ValueError('Total exceeds JavaScript safe integer range')
    return {'schemaVersion': 1, 'year': 2568, 'readOnly': True, 'automationEnabled': False,
            'rules': {'missingLoanDocument': ['-', ''], 'rounding': 'ROUND_HALF_UP per money cell', 'assigneeColumn': 'AI'},
            'verification': {'projectCount': len(projects), 'formulaChecks': report['localChecks'],
                             'moneyMismatchCount': 0, 'externalDataFreshnessVerified': False},
            'moneyLabels': MONEY, 'totals': totals, 'projects': projects}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audit_directory', type=Path)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    summary = json.loads((args.audit_directory / 'summary.json').read_text())
    if sha256(args.source) != summary['sourceSha256']:
        raise ValueError('Source changed since inspection')
    book = json.loads((args.audit_directory / 'workbook-extracted.json').read_text())
    records = json.loads((args.audit_directory / 'project-records.json').read_text())
    with localcontext() as context:
        context.prec = 50
        snapshot = build(book, records)
    if sha256(args.source) != summary['sourceSha256']:
        raise ValueError('Source changed during preparation')
    snapshot['sourceSha256'] = summary['sourceSha256']
    directory = Path(tempfile.mkdtemp(prefix='sgcu-year68-preview-'))
    path = directory / 'snapshot.json'
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2))
    path.chmod(0o600)
    print(json.dumps({'snapshotPath': str(path), 'projects': len(snapshot['projects']), 'readOnly': True,
                      'moneyMismatchCount': 0, 'assigneeColumn': 'AI'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
