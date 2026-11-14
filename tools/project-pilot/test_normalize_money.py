import unittest
from normalize_money import normalize_cell, prepare


class MoneyNormalizationTest(unittest.TestCase):
    def test_rounding_and_signs(self):
        for raw, value, satang in [('1.005', '1.01', 101), ('2.675', '2.68', 268),
                                   ('-2.675', '-2.68', -268), ('100.004', '100.00', 10000),
                                   ('0', '0.00', 0), ('-0.001', '0.00', 0),
                                   ('0.30000000000000004', '0.30', 30)]:
            with self.subTest(raw=raw):
                result = normalize_cell({'type': 'n', 'value': raw})
                self.assertEqual((result['value'], result['satang']), (value, satang))

    def test_missing_is_not_zero(self):
        for cell in [{}, {'value': ''}, {'value': None, 'hasFormula': True}]:
            self.assertIsNone(normalize_cell(cell)['satang'])

    def test_errors_and_numeric_strings_are_not_silently_accepted(self):
        for cell in [{'type': 'e', 'value': '#REF!'}, {'type': 's', 'value': '100'},
                     {'type': 'n', 'value': 'NaN'}, {'type': 'n', 'value': 'Infinity'},
                     {'type': 'n', 'value': 0.1}, {'type': 'n', 'value': '99999999999999999'}]:
            with self.subTest(cell=cell), self.assertRaises(ValueError):
                normalize_cell(cell)

    def test_per_cell_rounding_preserves_source_and_reports_total_difference(self):
        records = [{'year': 2568, 'sourceRow': row, 'projectCode': f'DEMO-{row}',
                    'sourceCells': {'O': {'type': 'n', 'value': '1.005'}}} for row in (3, 4)]
        values, report = prepare(records)
        self.assertEqual(report['columns']['O']['twoDecimalTotal'], '2.02')
        self.assertEqual(report['columns']['O']['totalDifference'], '0.010')
        self.assertEqual(report['changedCellCount'], 2)
        self.assertEqual(values[0]['money']['O']['sourceValue'], '1.005')
        self.assertEqual(records[0]['sourceCells']['O']['value'], '1.005')
        self.assertEqual(report['columns']['V']['blankCells'], 2)


if __name__ == '__main__':
    unittest.main()
