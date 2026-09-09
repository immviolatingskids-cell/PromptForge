"""Observe catalogue changes without inventing historical timestamps."""
import hashlib
from populator.storage import category_path


def catalogue_snapshot(data_root, pools):
    return {p['category']: {'count':p['count'], 'hash':hashlib.sha256(category_path(data_root,p['category']).read_bytes()).hexdigest()}
            for p in pools}


def catalogue_changes(previous, current, at):
    if previous is None:
        return []
    changes = []
    for category in sorted(set(previous) | set(current)):
        before, after = previous.get(category), current.get(category)
        if before == after:
            continue
        delta = (after or {}).get('count', 0) - (before or {}).get('count', 0)
        suffix = f' ({delta:+d} entries)' if delta else ''
        changes.append({'type':'pools', 'title':f'Observed catalogue change: {category}{suffix}',
                        'branch':'catalogue:' + category, 'at':at, 'delta':delta,
                        'observation':True})
    return changes
