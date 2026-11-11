'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLicenceRequest } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { ErrorBox, dangerBtn, inputCls, secondaryBtn } from './ui';

/** Sekce „Ověření licencí“ v profilu správce: čekající žádosti, dokument v nové záložce, Ověřit / Zamítnout. */
export const LicenceAdmin: React.FC = () => {
  const [requests, setRequests] = useState<AdminLicenceRequest[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ requests: AdminLicenceRequest[] }>('/api/admin/licence-requests');
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Žádosti se nepodařilo načíst.');
      setRequests((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (r: AdminLicenceRequest, decision: 'approve' | 'reject') => {
    const text =
      decision === 'approve'
        ? `Ověřit licenci ${r.licenceNumber} (${r.profileName})? Dokument se smaže.`
        : `Zamítnout žádost ${r.profileName}? Dokument se smaže.`;
    if (!window.confirm(text)) return;
    setBusyId(r.id);
    setError('');
    try {
      await api(`/api/admin/licence-requests/${encodeURIComponent(r.id)}`, {
        method: 'POST',
        body: { decision, note: notes[r.id]?.trim() || undefined },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rozhodnutí se nepodařilo uložit.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && <ErrorBox message={error} onRetry={() => void load()} />}
      {requests === null ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Načítám…</p>
      ) : requests.length === 0 ? (
        <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Žádné čekající žádosti.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="p-3 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#121318] space-y-2"
            >
              <div className="text-sm font-extrabold text-[#111111] dark:text-white break-words">{r.profileName}</div>
              <div className="text-xs font-bold text-stone-700 dark:text-stone-300 break-words">
                {r.email} · č. povolení {r.licenceNumber}
              </div>
              <input
                type="text"
                maxLength={300}
                placeholder="Poznámka při zamítnutí (nepovinné)"
                value={notes[r.id] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                className={inputCls}
                aria-label="Poznámka při zamítnutí"
              />
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/admin/licence-requests/${encodeURIComponent(r.id)}/document`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={secondaryBtn}
                >
                  Zobrazit dokument
                </a>
                <button type="button" disabled={busyId === r.id} onClick={() => void decide(r, 'approve')} className={secondaryBtn}>
                  Ověřit
                </button>
                <button type="button" disabled={busyId === r.id} onClick={() => void decide(r, 'reject')} className={dangerBtn}>
                  Zamítnout
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
