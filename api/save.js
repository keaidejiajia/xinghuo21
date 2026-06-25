/**
 * Vercel Serverless Function - save class data to GitHub data branch.
 * Includes a rollback guard so stale browser snapshots cannot overwrite newer data.
 */
const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'data.json';
const BRANCH = 'data';
const LARGE_DELETE_THRESHOLD = 25;

async function readGithubFile(ghData, token) {
  if (ghData.encoding === 'base64' && ghData.content) {
    return Buffer.from(ghData.content, 'base64').toString('utf-8');
  }

  if (ghData.encoding === 'none' && ghData.git_url) {
    const blobRes = await fetch(ghData.git_url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!blobRes.ok) {
      const errText = await blobRes.text().catch(() => '');
      throw new Error(`GitHub Blob API failed: ${blobRes.status} ${errText.slice(0, 200)}`);
    }
    const blobData = await blobRes.json();
    return Buffer.from(blobData.content, 'base64').toString('utf-8');
  }

  throw new Error(`Unsupported GitHub content encoding: ${ghData.encoding}`);
}

function getRecords(data) {
  return Array.isArray(data?.['behavior-records']) ? data['behavior-records'] : [];
}

function getRecordDate(record) {
  if (typeof record?.occurredDate === 'string' && record.occurredDate) return record.occurredDate;
  if (typeof record?.createdAt === 'string' && record.createdAt.length >= 10) return record.createdAt.slice(0, 10);
  return '';
}

function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function isAutoRuleRecord(record) {
  return Boolean(record?.isAutoRule) || String(record?.description || '').includes('\u81ea\u52a8\u89c4\u5219');
}

function compareRecordSets(currentData, incomingData) {
  const currentRecords = getRecords(currentData);
  const incomingRecords = getRecords(incomingData);
  const currentById = new Map();
  for (const record of currentRecords) {
    currentById.set(String(record?.id || ''), { record, signature: stableStringify(record) });
  }

  let incomingMismatches = 0;
  const incomingIds = new Set();
  for (const record of incomingRecords) {
    const id = String(record?.id || '');
    incomingIds.add(id);
    const current = currentById.get(id);
    if (!current || current.signature !== stableStringify(record)) incomingMismatches++;
  }

  const removedRecords = currentRecords.filter(record => !incomingIds.has(String(record?.id || '')));
  const removedAutoCount = removedRecords.filter(isAutoRuleRecord).length;

  return {
    incomingMismatches,
    removedCount: removedRecords.length,
    removedAutoCount,
    removedNonAutoCount: removedRecords.length - removedAutoCount,
    removedIds: removedRecords.map(record => String(record?.id || '')).filter(Boolean),
  };
}

function summarizeData(data) {
  const records = getRecords(data);
  let maxCreated = '';
  let maxCreatedMs = 0;
  let maxOccurred = '';
  let maxRecordMs = 0;
  let maxId = 0;

  for (const record of records) {
    if (typeof record?.createdAt === 'string' && record.createdAt) {
      if (record.createdAt > maxCreated) maxCreated = record.createdAt;
      const createdMs = Date.parse(record.createdAt);
      if (Number.isFinite(createdMs) && createdMs > maxCreatedMs) maxCreatedMs = createdMs;
      if (Number.isFinite(createdMs) && createdMs > maxRecordMs) maxRecordMs = createdMs;
    }

    const recordDate = getRecordDate(record);
    if (recordDate > maxOccurred) maxOccurred = recordDate;
    if (recordDate) {
      const occurredMs = Date.parse(`${recordDate}T23:59:59.999Z`);
      if (Number.isFinite(occurredMs) && occurredMs > maxRecordMs) maxRecordMs = occurredMs;
    }

    const numericId = Number(record?.id);
    if (Number.isFinite(numericId) && numericId > maxId) maxId = numericId;
  }

  return {
    records: records.length,
    maxCreated,
    maxCreatedMs,
    maxOccurred,
    maxRecordMs,
    maxId,
  };
}

function explicitDeletionCoversRemovedRecords(recordDiff, explicitDeletedRecordIds) {
  if (!Array.isArray(explicitDeletedRecordIds) || explicitDeletedRecordIds.length === 0) return false;
  const explicitIds = new Set(explicitDeletedRecordIds.map(id => String(id)));
  return recordDiff.removedIds.length > 0 && recordDiff.removedIds.every(id => explicitIds.has(id));
}

export function checkRollbackRisk(currentData, incomingData, options = {}) {
  const current = summarizeData(currentData);
  const incoming = summarizeData(incomingData);
  const recordDiff = compareRecordSets(currentData, incomingData);
  const reasons = [];

  if (current.records > 0 && incoming.records === 0) {
    reasons.push('incoming payload has no behavior records while cloud data has records');
  }

  const recordCountDrop = current.records - incoming.records;
  const deletionOnly = recordCountDrop > 0 && recordDiff.incomingMismatches === 0;

  if (deletionOnly) {
    if (explicitDeletionCoversRemovedRecords(recordDiff, options.explicitDeletedRecordIds)) {
      return { stale: false, reasons, current, incoming, recordDiff };
    }
    if (recordDiff.removedNonAutoCount > 0 && recordCountDrop > LARGE_DELETE_THRESHOLD) {
      reasons.push('incoming payload deletes ' + recordDiff.removedNonAutoCount + ' non-auto records and ' + recordCountDrop + ' records total');
    }
    return { stale: reasons.length > 0, reasons, current, incoming, recordDiff };
  }

  if (current.maxRecordMs > 0 && incoming.maxRecordMs > 0 && incoming.maxRecordMs < current.maxRecordMs) {
    reasons.push('incoming latest behavior date is older than cloud latest behavior date');
  }

  if (recordCountDrop > LARGE_DELETE_THRESHOLD) {
    reasons.push('incoming payload has ' + recordCountDrop + ' fewer records than cloud data');
  }

  if (current.maxId > 0 && incoming.maxId > 0 && incoming.maxId + LARGE_DELETE_THRESHOLD < current.maxId && incoming.records < current.records) {
    reasons.push('incoming record id sequence is behind cloud data');
  }

  if (incoming.records < current.records && recordDiff.incomingMismatches > 0) {
    reasons.push('incoming payload has ' + recordDiff.incomingMismatches + ' records that do not match current cloud records');
  }

  return { stale: reasons.length > 0, reasons, current, incoming, recordDiff };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const startedAt = Date.now();
  try {
    const newData = req.body;
    let explicitDeletedRecordIds = [];
    const explicitDeleteHeader = req.headers['x-xinghuo-deleted-record-ids'];
    if (typeof explicitDeleteHeader === 'string' && explicitDeleteHeader) {
      try {
        const parsed = JSON.parse(explicitDeleteHeader);
        if (Array.isArray(parsed)) explicitDeletedRecordIds = parsed.map(id => String(id)).filter(Boolean);
      } catch {
        explicitDeletedRecordIds = [];
      }
    }
    const dataKeys = newData && typeof newData === 'object' ? Object.keys(newData) : [];
    const payloadText = JSON.stringify(newData, null, 2);
    const payloadBytes = Buffer.byteLength(payloadText, 'utf-8');
    console.log('[api/save] started', { dataKeys, payloadBytes });
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const content = Buffer.from(payloadText, 'utf-8').toString('base64');

    for (let attempt = 0; attempt < 3; attempt++) {
      let sha = null;
      let currentData = null;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (getRes.ok) {
        const ghData = await getRes.json();
        sha = ghData.sha;
        const currentText = await readGithubFile(ghData, token);
        currentData = JSON.parse(currentText.replace(/^\uFEFF/, ''));
      } else if (getRes.status !== 404) {
        const errText = await getRes.text().catch(() => '');
        console.error('[api/save] get sha failed', { status: getRes.status, body: errText.slice(0, 300) });
        return res.status(502).json({ error: 'GitHub SHA lookup failed', detail: { status: getRes.status, body: errText.slice(0, 300) } });
      }

      if (currentData) {
        const rollbackRisk = checkRollbackRisk(currentData, newData, { explicitDeletedRecordIds });
        if (rollbackRisk.stale) {
          console.warn('[api/save] stale payload rejected', rollbackRisk);
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(409).json({
            error: 'STALE_DATA_REJECTED',
            message: '云端已有更新的数据，本次保存看起来是旧页面或旧缓存，已拒绝覆盖。请刷新后重新操作。',
            detail: rollbackRisk,
          });
        }
      }

      const putBody = { message: `📊 ${new Date().toLocaleString('zh-CN')}`, content, branch: BRANCH };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });

      if (putRes.ok) {
        const ms = Date.now() - startedAt;
        console.log('[api/save] saved', { attempt: attempt + 1, ms, payloadBytes });
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ ok: true, message: 'Saved', time: new Date().toISOString(), ms, bytes: payloadBytes });
      }

      if (putRes.status !== 409) {
        const errText = await putRes.text();
        console.error('[api/save] put failed', { status: putRes.status, body: errText.slice(0, 300), ms: Date.now() - startedAt });
        return res.status(500).json({ error: 'GitHub API failed', detail: { status: putRes.status, body: errText.slice(0, 200) } });
      }
      console.warn('[api/save] conflict, retrying', { attempt: attempt + 1, ms: Date.now() - startedAt });
      await new Promise(r => setTimeout(r, 600));
    }
    console.error('[api/save] conflict after retries', { ms: Date.now() - startedAt });
    return res.status(500).json({ error: 'Conflict after 3 retries' });
  } catch (e) {
    console.error('[api/save] crashed', { message: e.message, ms: Date.now() - startedAt });
    return res.status(500).json({ error: e.message });
  }
}
