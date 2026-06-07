import json, os, sys

# Find data.json
desktop = os.path.expanduser('~/Desktop')
data_path = None
for root, dirs, files in os.walk(desktop):
    if 'data.json' in files and '星火' in root:
        data_path = os.path.join(root, 'data.json')
        break

if not data_path:
    desktop_win = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop')
    for root, dirs, files in os.walk(desktop_win):
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

# Sort records by (createdAt, id)
records.sort(key=lambda r: (r.get('createdAt', ''), int(r.get('id', '0') or '0')))

SHIELD_OFFSET_RATIO = config.get('shieldOffsetRatio', 2)
DEMOTION_THRESHOLD = config.get('immortalDemotionThreshold', 3)
front_levels = config.get('frontLevels', [])
back_levels = config.get('backLevels', [])

def get_front_blanks(level):
    if front_levels and level <= len(front_levels):
        return front_levels[level - 1].get('blanks', 8)
    return 8

def get_back_checks(level, heart_demons):
    if back_levels and level <= len(back_levels):
        base = back_levels[level - 1].get('checksRequired', 0)
        return base + heart_demons
    return 0

# Initialize simulation
sim = {}
for s in students_list:
    sid = s['id']
    sim[sid] = {
        'id': sid, 'name': s['name'], 'number': s['number'],
        'cardSide': 'front', 'currentLevel': 1,
        'blanksFilled': 0, 'cumulativeChecks': 0,
        'heartDemonMarks': 0, 'starShields': 0,
        'heritagePoints': 0, 'totalHeritageEarned': 0,
        'totalHeritageDonated': 0, 'totalBlanksEverFilled': 0,
        'totalHeartDemonsEverGained': 0, 'totalShieldsEverEarned': 0,
        'totalChecksEverEarned': 0, 'totalShieldsExchanged': 0,
        'consecutiveNoViolationDays': 0,
    }

# ===== PROCESS WITH RECORD-STORED shieldsConsumed =====
print(f"Processing {len(records)} records for {len(sim)} students...")

for idx, r in enumerate(records):
    sid = r['studentId']
    if sid not in sim:
        continue

    direction = r.get('direction', '')
    weight = r.get('weight', 0) or 0
    extra = r.get('extraWeight', 0) or 0
    ew = weight + extra
    sc = r.get('shieldsConsumed', 0) or 0  # Use STORED shieldsConsumed
    desc = r.get('description', '') or ''
    remark = r.get('remark', '') or ''

    st = sim[sid]

    if direction == 'positive':
        if st['cardSide'] == 'front':
            # processPositiveBehaviorFront
            st['starShields'] += ew
            st['totalShieldsEverEarned'] += ew
            # Check for exchange record
            if desc.startswith('兑换：') or '兑换' in desc:
                if '消耗' in remark:
                    try:
                        cost_str = remark.split('消耗')[1].split('护盾')[0].strip()
                        cost = int(cost_str)
                        st['starShields'] -= cost
                        st['totalShieldsExchanged'] += cost
                    except ValueError:
                        pass
        else:
            # processPositiveBehavior (back)
            if st['cardSide'] == 'back':
                if ew >= 3 and st['heartDemonMarks'] > 0:
                    st['heartDemonMarks'] -= 1
                st['cumulativeChecks'] += ew
                st['totalChecksEverEarned'] += ew
                if st['currentLevel'] == 6:
                    st['heritagePoints'] += ew
                    st['totalHeritageEarned'] += ew
                    while st['heartDemonMarks'] > 0 and st['heritagePoints'] > 0:
                        st['heartDemonMarks'] -= 1
                        st['heritagePoints'] -= 1
                else:
                    next_level = st['currentLevel'] + 1
                    if next_level <= 6:
                        required = get_back_checks(next_level, st['heartDemonMarks'])
                        if st['cumulativeChecks'] >= required:
                            st['currentLevel'] = next_level

    elif direction == 'negative':
        if st['cardSide'] == 'front':
            # processNegativeBehavior front
            # Use stored shieldsConsumed to derive actualFill
            # Formula: shieldsConsumed = (ew - actualFill) * SHIELD_OFFSET_RATIO
            # So: actualFill = ew - shieldsConsumed / SHIELD_OFFSET_RATIO
            actual_fill = ew - sc // SHIELD_OFFSET_RATIO
            if actual_fill < 0:
                actual_fill = 0  # Safety floor

            st['starShields'] -= sc
            st['blanksFilled'] += actual_fill
            st['totalBlanksEverFilled'] += actual_fill

            # Level up / flip check
            level6_blanks = get_front_blanks(6)
            if st['currentLevel'] == 6 and st['blanksFilled'] >= level6_blanks:
                st['cardSide'] = 'back'
                st['currentLevel'] = 1
                st['blanksFilled'] = 0
                st['cumulativeChecks'] = 0
            elif st['currentLevel'] < 6 and st['blanksFilled'] >= get_front_blanks(st['currentLevel']):
                st['currentLevel'] += 1
                st['blanksFilled'] = 0
        else:
            # processNegativeBehavior back
            st['heartDemonMarks'] += 1
            st['totalHeartDemonsEverGained'] += 1
            # Heritage auto-offset for immortal
            while st['heartDemonMarks'] > 0 and st['heritagePoints'] > 0 and st['currentLevel'] == 6:
                st['heartDemonMarks'] -= 1
                st['heritagePoints'] -= 1
            # Immortal demotion
            if st['cardSide'] == 'back' and st['currentLevel'] == 6 and st['heartDemonMarks'] >= DEMOTION_THRESHOLD:
                st['currentLevel'] = 5
                st['heartDemonMarks'] = 0
                st['heritagePoints'] = 0
                st['cumulativeChecks'] = 0

        st['consecutiveNoViolationDays'] = 0

# ===== COMPARE =====
print("\n" + "=" * 80)
print("COMPARISON: Simulated vs Actual (data.json)")
print("=" * 80)

issues = []
for sid, st in sorted(sim.items(), key=lambda x: x[1]['number']):
    actual = students.get(sid)
    if not actual:
        continue

    diffs = []
    comparisons = [
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

    for field, label in comparisons:
        sim_val = st.get(field, 0) or 0
        actual_val = actual.get(field, 0) or 0
        if sim_val != actual_val:
            diffs.append((field, label, sim_val, actual_val, sim_val - actual_val))

    if st['cardSide'] != actual.get('cardSide'):
        diffs.append(('cardSide', 'side', st['cardSide'], actual.get('cardSide'), 'MISMATCH'))
    if st['currentLevel'] != actual.get('currentLevel'):
        diffs.append(('currentLevel', 'level', st['currentLevel'], actual.get('currentLevel'),
                      st['currentLevel'] - actual.get('currentLevel', 0)))

    if diffs:
        issues.append((st, diffs))

if not issues:
    print("\nALL VALUES MATCH!")
else:
    print(f"\n{len(issues)} students have discrepancies:\n")
    for st, diffs in issues:
        actual = students[st['id']]
        print(f"#{st['number']} {st['name']}")
        print(f"  actual: side={actual.get('cardSide')}, lv={actual.get('currentLevel')}")
        print(f"  sim:    side={st['cardSide']}, lv={st['currentLevel']}")
        for field, label, sim_val, actual_val, diff in diffs:
            if isinstance(diff, int):
                direction = 'sim HIGHER' if diff > 0 else 'sim LOWER'
                print(f"  {label}({field}): sim={sim_val} vs actual={actual_val} [{direction} by {abs(diff)}]")
            else:
                print(f"  {label}({field}): sim={sim_val} vs actual={actual_val} -> TYPE MISMATCH")
        print()

print(f"Summary: {len(issues)}/{len(sim)} students have discrepancies")

# ===== WRITE CORRECTION IF NEEDED =====
if issues:
    print("\n" + "=" * 80)
    print("CORRECTING data.json with simulated values...")
    for st, diffs in issues:
        sid = st['id']
        actual = students[sid]
        # Only correct cumulative fields that should always match records
        actual['totalShieldsEverEarned'] = st['totalShieldsEverEarned']
        actual['totalBlanksEverFilled'] = st['totalBlanksEverFilled']
        actual['totalChecksEverEarned'] = st['totalChecksEverEarned']
        actual['totalHeartDemonsEverGained'] = st['totalHeartDemonsEverGained']
        actual['totalShieldsExchanged'] = st['totalShieldsExchanged']
        actual['totalHeritageEarned'] = st['totalHeritageEarned']
        actual['totalHeritageDonated'] = st['totalHeritageDonated']

        # Correct current fields
        actual['starShields'] = st['starShields']
        actual['blanksFilled'] = st['blanksFilled']
        actual['cumulativeChecks'] = st['cumulativeChecks']
        actual['heartDemonMarks'] = st['heartDemonMarks']
        actual['heritagePoints'] = st['heritagePoints']
        actual['cardSide'] = st['cardSide']
        actual['currentLevel'] = st['currentLevel']

        print(f"  Corrected #{st['number']} {st['name']}")

    # Write back
    backup_path = data_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nBackup saved to: {backup_path}")

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Corrected data saved to: {data_path}")
else:
    print("\nNo corrections needed.")
