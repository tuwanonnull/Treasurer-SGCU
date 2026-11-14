"""Prepare a private two-decimal candidate from the read-only workbook extraction.

Does not recalculate formulas, update the source XLSX, or publish/import data.
"""
import argparse
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
import json
from pathlib import Path
import tempfile

from inspect_workbook import MONEY


def normalize_cell(cell):
    raw = cell.get('value')
    if raw in (None, ''):
        return {'sourceValue': raw, 'value': None, 'satang': None, 'changed': False}
    if cell.get('type', 'n') != 'n' or not isinstance(raw, str):
        raise ValueError('Expected the original numeric text from XLSX')
    try:
        with localcontext() as context:
            context.prec = 50
            original = Decimal(raw)
            if not original.is_finite():
                raise ValueError('Nonfinite money')
            rounded = original.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            satang = int(rounded * 100)
            if abs(satang) > 9007199254740991:
                raise ValueError('Money exceeds JavaScript safe integer range')
            return {'sourceValue': raw, 'value': format(Decimal(satang) / 100, '.2f'),
                    'satang': satang, 'changed': original != rounded}
    except InvalidOperation as error:
        raise ValueError('Invalid numeric money') from error


def prepare(records):
    converted = []
    changes = []
    errors = []
    totals = {col: {'original': Decimal(0), 'satang': 0, 'changedCells': 0, 'blankCells': 0} for col in MONEY}
    with localcontext() as context:
        context.prec = 50
        for record in records:
            money = {}
            for col in MONEY:
                cell = record['sourceCells'].get(col, {})
                try:
                    normalized = normalize_cell(cell)
                except ValueError as error:
                    errors.append({'cell': f"{col}{record['sourceRow']}", 'error': str(error)})
                    continue
                money[col] = normalized
                if normalized['satang'] is None:
                    totals[col]['blankCells'] += 1
                else:
                    totals[col]['original'] += Decimal(normalized['sourceValue'])
                    totals[col]['satang'] += normalized['satang']
                if normalized['changed']:
                    totals[col]['changedCells'] += 1
                    changes.append({'cell': f"{col}{record['sourceRow']}", **normalized})
            converted.append({'sourceRow': record['sourceRow'], 'year': record['year'],
                              'projectCode': record['projectCode'], 'money': money})
        columns = {
            col: {'label': MONEY[col], 'sourceTotal': str(t['original']),
                  'twoDecimalTotal': format(Decimal(t['satang']) / 100, '.2f'),
                  'totalDifference': str(Decimal(t['satang']) / 100 - t['original']),
                  'changedCells': t['changedCells'], 'blankCells': t['blankCells']}
            for col, t in totals.items()
        }
    report = {'rounding': 'ROUND_HALF_UP per monetary cell, two decimal places; integer satang storage',
              'formulaRecalculated': False, 'readyForProduction': False,
              'recordCount': len(records), 'changedCellCount': len(changes),
              'columns': columns, 'changes': changes, 'errors': errors}
    return converted, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('records', type=Path)
    args = parser.parse_args()
    converted, report = prepare(json.loads(args.records.read_text(encoding='utf-8')))
    destination = Path(tempfile.mkdtemp(prefix='sgcu-year68-money-'))
    for name, value in [('money-candidate.json', converted), ('rounding-report.json', report)]:
        target = destination / name
        target.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        target.chmod(0o600)
    print(json.dumps({'outputDirectory': str(destination), 'recordCount': report['recordCount'],
                      'changedCellCount': report['changedCellCount'], 'errors': report['errors'],
                      'columns': {col: {'changedCells': values['changedCells'], 'totalDifference': values['totalDifference']}
                                  for col, values in report['columns'].items()}}, ensure_ascii=False, indent=2))
    if report['errors']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
