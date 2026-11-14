"""Compare the web money calculator against the audited Python Decimal formulas."""
import argparse
import json
from pathlib import Path
import subprocess
from decimal import Decimal as D, localcontext
from reconcile_formulas import calculate
from inspect_workbook import MONEY

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('snapshot', type=Path)
args = parser.parse_args()
original = args.snapshot.read_bytes()
snapshot = json.loads(original)
cases = []
status_cases = []
with localcontext() as context:
    context.prec = 50
    for p in snapshot['projects']:
        f = p['formulaInputs']
        baseline = {**p['statuses'], 'E': 'test-org', 'BS': None if f['advanceRate'] is None else D(f['advanceRate']),
                    'Z': 'document' if f['hasLoanDocument'] else None, 'U': f['transferDirection']}
        baseline.update({col: None if p['money'][col] is None else D(p['money'][col]) / 100 for col in ('O', 'V', 'AJ')})
        variants = [{}, {'O': (baseline['O'] or D(0)) + D('.01')}, {'AJ': D('1234.56')},
                    {'V': D('100.01'), 'U': 'เพิ่ม'}, {'V': D('100.01'), 'U': 'ลด'}, {'AJ': None, 'V': None}]
        for changes in variants:
            inputs = {**baseline, **changes}
            calculated = calculate(inputs, {'test-org': None}, two_decimals=True, dash_means_missing_document=True)
            expected = {col: None if calculated[col] is None else int(calculated[col] * 100) for col in MONEY}
            patch = {col: '' if val is None else format(val, '.2f') if isinstance(val, D) else val for col, val in changes.items()}
            cases.append({'project': p, 'changes': patch, 'expected': expected})
        for patch in [{'H': 'อนุมัติโครงการ'}, {'H': 'รอแก้ไข'}, {'Q': 'กระบวนการโอนงบประมาณมีผลบังคับใช้'}, {'Q': None}, {'Y': 'โครงการรับเงินแล้ว'}, {'Y': None}]:
            calculated = calculate({**baseline, **patch}, {'test-org': None}, two_decimals=True, dash_means_missing_document=True)
            status_cases.append({'project': p, 'statuses': {**p['statuses'], **patch}, 'expected': {col: None if calculated[col] is None else int(calculated[col] * 100) for col in MONEY}})
runner = '''
import {previewMoney, calculateMoney} from './tools/project-pilot/finance.mjs';
import assert from 'node:assert/strict';
let raw = ''; for await (const c of process.stdin) raw += c;
const {cases, statusCases} = JSON.parse(raw);
for (const item of cases) {
  try { assert.deepEqual(previewMoney(item.project, item.changes).after, item.expected); }
  catch (e) { throw new Error(`Mismatch at ${item.project.id}: ${e.message}`); }
}
for (const item of statusCases) assert.deepEqual(calculateMoney({...item.project, statuses:item.statuses}), item.expected);
console.log(JSON.stringify({moneyCasesPassed: cases.length, statusCasesPassed: statusCases.length}));
'''
result = subprocess.run(['node', '--input-type=module', '-e', runner], input=json.dumps({'cases': cases, 'statusCases': status_cases}), text=True, capture_output=True,
                        cwd=Path(__file__).resolve().parents[2], check=True)
assert args.snapshot.read_bytes() == original
print(result.stdout.strip())
