"""Rebuild a review-only starting dataset from the reviewed XLSX, never a trial backup."""
import argparse
from decimal import localcontext
import hashlib
import json
from pathlib import Path
import tempfile
from inspect_workbook import read_workbook, summarize, sha256
from build_year68_snapshot import build


def prepare(source, expected_hash):
    source = Path(source)
    if source.suffix.lower() != '.xlsx':
        raise ValueError('Only the original XLSX is accepted; trial JSON/backups are forbidden')
    if len(expected_hash) != 64 or sha256(source) != expected_hash:
        raise ValueError('Source differs from the reviewed original')
    book = read_workbook(source)
    _, records = summarize(book)
    with localcontext() as context:
        context.prec = 50
        snapshot = build(book, records)
    if sha256(source) != expected_hash:
        raise ValueError('Source changed during preparation')
    snapshot['sourceSha256'] = expected_hash
    raw = json.dumps(snapshot, ensure_ascii=False, indent=2).encode('utf-8')
    manifest = {'schemaVersion': 1, 'academicYear': 2568, 'purpose': 'production-candidate',
                'status': 'awaiting-review', 'activated': False, 'writesPerformed': False,
                'sourceKind': 'reviewed-original-xlsx', 'sourceSha256': expected_hash,
                'snapshotSha256': hashlib.sha256(raw).hexdigest(),
                'projectCount': len(snapshot['projects']), 'totals': snapshot['totals'],
                'trialDataImported': False, 'assignments': [], 'grants': [],
                'pendingRequests': [], 'audit': [], 'externalDataFreshnessVerified': False}
    directory = Path(tempfile.mkdtemp(prefix='sgcu-production-candidate-2568-'))
    for name, content in [('snapshot.json', raw), ('manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8'))]:
        with (directory / name).open('xb') as stream:
            (directory / name).chmod(0o600)
            stream.write(content)
    return directory


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--expected-source-sha256', required=True)
    args = parser.parse_args()
    print(json.dumps({'directory': str(prepare(args.source, args.expected_source_sha256)), 'activated': False}))
