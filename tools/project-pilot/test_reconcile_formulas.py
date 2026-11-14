import unittest
from decimal import Decimal as D
from reconcile_formulas import calculate, arithmetic, canonical, TRANSFER_ACTIVE


def inputs(**changes):
    data = {'O': D('100.00'), 'V': None, 'AJ': D('33.335'), 'E': 'demo', 'H': 'อนุมัติโครงการ',
            'Z': None, 'BS': None, 'U': None, 'Y': 'โครงการรับเงินแล้ว', 'Q': '', 'BA': 'โครงการรับเงินแล้ว'}
    data.update(changes)
    return data


class FormulaReconciliationTest(unittest.TestCase):
    def test_recalculate_dependencies_after_rounding_inputs(self):
        result = calculate(inputs(), {'demo': D(80)}, two_decimals=True)
        self.assertEqual(result['AJ'], D('33.34'))
        self.assertEqual(result['AE'], D('80.00'))
        self.assertEqual(result['BC'], D('-46.66'))
        self.assertEqual(result['BF'], D('66.66'))
        self.assertEqual(result['BB'], 'คืน')

    def test_literal_dash_and_diagnostic_are_separate(self):
        data = inputs(H='ยกเลิกโครงการ', Z='-')
        self.assertEqual(calculate(data, {})['AE'], D(80))
        self.assertIsNone(calculate(data, {}, dash_means_missing_document=True)['AE'])
        # An actual document number still triggers the inspected formula regardless of H.
        self.assertEqual(calculate(inputs(H='รอแก้ไข', Z='DEMO-001'), {}, dash_means_missing_document=True)['AE'], D(80))

    def test_budget_transfer_applies_only_for_exact_formula_statuses(self):
        for status in TRANSFER_ACTIVE:
            self.assertEqual(calculate(inputs(V=D(10), U='ลด', Q=status), {}, True)['BF'], D('56.66'))
        self.assertEqual(calculate(inputs(V=D(10), U='เพิ่ม', Q='รอแก้ไข'), {}, True)['BF'], D('66.66'))
        with self.assertRaises(ValueError):
            calculate(inputs(V=D(10), U='unknown'), {})

    def test_override_zero_and_missing_lookup_default(self):
        self.assertEqual(calculate(inputs(BS=D(0)), {'demo': D(65)})['AE'], D(0))
        self.assertEqual(calculate(inputs(), {})['BU'], D(80))
        self.assertEqual(calculate(inputs(BS=D(65)), {})['AE'], D(65))

    def test_blank_zero_and_percentage_division(self):
        result = calculate(inputs(H='รอแก้ไข', Z=None, Y=None, AJ=None, O=D(0)), {}, True)
        self.assertIsNone(result['AE'])
        self.assertIsNone(result['BC'])
        self.assertIsNone(result['W'])
        self.assertEqual(result['BE'], D(0))
        self.assertEqual(result['BF'], D(0))
        self.assertEqual(result['BG'], D(0))
        self.assertIsNone(result['BB'])

    def test_advance_status_controls_settlement(self):
        for status in ['โครงการรับเงินแล้ว', 'เหรัญญิกรับเงินจากกิจการนิสิต', 'ส่งกิจการนิสิตแล้ว รออนุมัติ']:
            self.assertEqual(calculate(inputs(Y=status), {}, True)['BC'], D('-46.66'))
        self.assertEqual(calculate(inputs(Y='สำรองจ่ายก่อน'), {}, True)['BC'], D('33.34'))

    def test_arithmetic_does_not_execute_code(self):
        self.assertEqual(arithmetic('100520.79+253895'), D('354415.79'))
        self.assertEqual(arithmetic('0.1+0.2'), D('0.3'))
        for text in ['__import__("os").system("echo unsafe")', 'O3+1', '2**20', '[1,2]', 'True']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                arithmetic(text)

    def test_formula_guard_preserves_text_literal_spacing(self):
        self.assertEqual(canonical(' IF ( A1 = "a b", 1, 0 ) '), 'IF(A1="a b",1,0)')
        self.assertNotEqual(canonical('A1="a b"'), canonical('A1="ab"'))


if __name__ == '__main__':
    unittest.main()
