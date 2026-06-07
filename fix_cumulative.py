import json, os, sys
from collections import defaultdict

desktop = os.path.expanduser('~/Desktop')
data_path = None
for root, dirs, files in os.walk(desktop):
    if 'data.json' in files and '星火' in root:
        data_path = os.path.join(root, 'data.json')
        break

if not data_path:
    print("ERROR: data.json not found")
    sys.exit(1)

print(f"Reading: {data_path}")
with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

students_list = data['students']
students = {s['id']: s for s in students_list}
records = data.get('behavior-records', [])
config = data.get('app-config', {})

# Sort records chronologically
records.sort(key=lambda r: (r.get('createdAt', ''), int(r.get('id', '0') or '0')))

SHIELD_RATIO = config.get('shieldOffsetRatio', 2)
DEMOTE_THRESH = config.get('immortalDemotionThreshold', 3)
front_levels = config.get('frontLevels', [])
back_levels = config.get('backLevels', [])

def get_front_blanks(level):
    if front_levels and level <= len(front_levels):
        return front_levels[level - 1].get('blanks', 8)
    return 8

def get_back_checks(level, hd):
    if back_levels and level <= len(back_levels):
        return back_levels[level - 1].get('checksRequired', 0) + hd
    return 0

# ===== SIMULATE WITH EXACT APP LOGIC =====
sim = {}
for s in students_list:
    sid = s['id']
    sim[sid] = {
        'id': sid, 'name': s['name'], 'number': s['number'],
        'cardSide': 'front', 'currentLevel': 1,
        'blanksFilled': 0, 'cumulativeChecks': 0,
        'heartDemonMarks': 0, 'starShields': 0,
        'heritagePoints': 0, 'totalHeritageEarned': 0,
        'totalHeritageDonated': 0,
        'totalBlanksEverFilled': 0, 'totalHeartDemonsEverGained': 0,
        'totalShieldsEverEarned': 0, 'totalChecksEverEarned': 0,
        'totalShieldsExchanged': 0,
    }

print(f"Processing {len(records)} records for {len(sim)} students...")

for r in records:
    sid = r['studentId']
    if sid not in sim:
        continue

    direction = r.get('direction', '')
    weight = r.get('weight', 0) or 0
    extra = r.get('extraWeight', 0) or 0
    ew = weight + extra
    desc = r.get('description', '') or ''
    remark = r.get('remark', '') or ''

    s = sim[sid]

    if direction == 'positive':
        if s['cardSide'] == 'front':
            # === processPositiveBehaviorFront (cardLogic.ts:89-98) ===
            s['starShields'] += ew
            s['totalShieldsEverEarned'] += ew
            # Exchange detection
            if ('兑换' in desc) and ('消耗' in remark):
                try:
                    cost = int(remark.split('消耗')[1].split('护盾')[0].strip())
                    s['starShields'] = max(0, s['starShields'] - cost)
                    s['totalShieldsExchanged'] += cost
                except ValueError:
                    pass
        else:
            # === processPositiveBehavior (cardLogic.ts:101-159) ===
            if s['cardSide'] == 'back':
                # weight >= 3 clears 1 heart demon (all back students)
                if ew >= 3 and s['heartDemonMarks'] > 0:
                    s['heartDemonMarks'] -= 1

                s['cumulativeChecks'] += ew
                s['totalChecksEverEarned'] += ew

                if s['currentLevel'] == 6:
                    s['heritagePoints'] += ew
                    s['totalHeritageEarned'] += ew
                    # Heritage auto-offset heart demons
                    while s['heartDemonMarks'] > 0 and s['heritagePoints'] > 0:
                        s['heartDemonMarks'] -= 1
                        s['heritagePoints'] -= 1
                else:
                    next_lv = s['currentLevel'] + 1
                    if next_lv <= 6:
                        required = get_back_checks(next_lv, s['heartDemonMarks'])
                        if s['cumulativeChecks'] >= required:
                            s['currentLevel'] = next_lv
    else:
        # === processNegativeBehavior (cardLogic.ts:18-86) ===
        if s['cardSide'] == 'front':
            shield_count = s['starShields']
            max_offset = shield_count // SHIELD_RATIO
            actual_fill = max(0, ew - max_offset)
            sc_used = min(shield_count, (ew - actual_fill) * SHIELD_RATIO)

            s['starShields'] -= sc_used  # Won't go below 0 because sc_used <= shield_count
            s['blanksFilled'] += actual_fill
            s['totalBlanksEverFilled'] += actual_fill

            # Level up / flip
            lv6_blanks = get_front_blanks(6)
            if s['currentLevel'] == 6 and s['blanksFilled'] >= lv6_blanks:
                s['cardSide'] = 'back'
                s['currentLevel'] = 1
                s['blanksFilled'] = 0
                s['cumulativeChecks'] = 0
            elif s['currentLevel'] < 6 and s['blanksFilled'] >= get_front_blanks(s['currentLevel']):
                s['currentLevel'] += 1
                s['blanksFilled'] = 0
        else:
            s['heartDemonMarks'] += 1
            s['totalHeartDemonsEverGained'] += 1
            # Immortal heritage offset
            while s['heartDemonMarks'] > 0 and s['heritagePoints'] > 0 and s['currentLevel'] == 6:
                s['heartDemonMarks'] -= 1
                s['heritagePoints'] -= 1
            # Immortal demotion
            if s['cardSide'] == 'back' and s['currentLevel'] == 6 and s['heartDemonMarks'] >= DEMOTE_THRESH:
                s['currentLevel'] = 5
                s['heartDemonMarks'] = 0
                s['heritagePoints'] = 0
                s['cumulativeChecks'] = 0

        s['consecutiveNoViolationDays'] = 0

# ===== COMPARE =====
print("\n" + "=" * 80)
print("COMPARISON")
print("=" * 80)

issues = []
for sid, st in sorted(sim.items(), key=lambda x: x[1]['number']):
    actual = students[sid]
    diffs = []

    fields_to_check = [
        ('starShields', 'cur-shield'),
        ('totalShieldsEverEarned', 'tot-shield'),
        ('totalShieldsExchanged', 'exchanged'),
        ('blanksFilled', 'cur-blank'),
        ('totalBlanksEverFilled', 'tot-blank'),
        ('cumulativeChecks', 'cur-check'),
        ('totalChecksEverEarned', 'tot-check'),
        ('heartDemonMarks', 'cur-heart'),
        ('totalHeartDemonsEverGained', 'tot-heart'),
        ('heritagePoints', 'heritage'),
        ('totalHeritageEarned', 'tot-herit'),
        ('totalHeritageDonated', 'donated'),
    ]

    for field, label in fields_to_check:
        sim_val = st.get(field, 0)
        act_val = actual.get(field, 0) or 0
        if sim_val != act_val:
            diffs.append((field, label, sim_val, act_val))

    if st['cardSide'] != actual.get('cardSide'):
        diffs.append(('cardSide', 'side', st['cardSide'], actual.get('cardSide')))
    if st['currentLevel'] != actual.get('currentLevel'):
        diffs.append(('currentLevel', 'level', st['currentLevel'], actual.get('currentLevel')))

    if diffs:
        issues.append((st, diffs))

if not issues:
    print("\nALL VALUES MATCH!")
else:
    print(f"\n{len(issues)} students have discrepancies:\n")
    for st, diffs in issues:
        s_act = students[st['id']]
        print(f"#{st['number']} {st['name']}")
        print(f"  actual: side={s_act.get('cardSide')}, lv={s_act.get('currentLevel')}")
        print(f"  sim:    side={st['cardSide']}, lv={st['currentLevel']}")
        for field, label, sim_val, act_val in diffs:
            print(f"  {label}({field}): sim={sim_val} vs actual={act_val}")
        print()

    # ===== APPLY CORRECTIONS =====
    print("=" * 80)
    print("APPLYING CORRECTIONS...")
    print("=" * 80)

    for st, diffs in issues:
        sid = st['id']
        s_act = students[sid]

        # Only correct if simulation is self-consistent (no negative values)
        # and side/level match (otherwise simulation may have diverged)
        sim_ok = (
            st['starShields'] >= 0 and
            st['blanksFilled'] >= 0 and
            st['cumulativeChecks'] >= 0 and
            st['heartDemonMarks'] >= 0 and
            st['heritagePoints'] >= 0
        )

        if sim_ok:
            for field, label, sim_val, act_val in diffs:
                if field in ('cardSide', 'currentLevel'):
                    continue  # Skip side/level changes
                # Always correct cumulative fields
                if field.startswith('total'):
                    s_act[field] = sim_val
                # Only correct current fields if side/level match
                elif st['cardSide'] == s_act.get('cardSide') and st['currentLevel'] == s_act.get('currentLevel'):
                    s_act[field] = sim_val

            print(f"  Corrected #{st['number']} {st['name']}")
        else:
            # Partial correction: only cumulative fields
            print(f"  Partial: #{st['number']} {st['name']} (sim has issues, only cumulative fields)")
            for field, label, sim_val, act_val in diffs:
                if field.startswith('total') or field in ('totalShieldsExchanged',):
                    s_act[field] = sim_val

    # Write back
    backup_path = data_path + '.backup3'
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nBackup: {backup_path}")

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved: {data_path}")

print("\nDone.")
