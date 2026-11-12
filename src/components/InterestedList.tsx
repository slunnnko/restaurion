'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EngagementForPoster, PublicJob } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { initials } from '@/lib/format';
import { ErrorBox } from './ui';
import { EngagementDetailModal } from './EngagementDetailModal';
import { STATUS_CLS, STATUS_LABEL } from './engagementStatus';
import type { EngagementStatus } from '@/types/api';

interface InterestedListProps {
  job: PublicJob;
  /** Po přijetí / odmítnutí, aby si nástěnka obnovila data. */
  onChanged: () => void;
  showHeading?: boolean;
}

const chipBase =
  'inline-flex items-center gap-2 min-h-10 pl-1.5 pr-3 py-1 rounded-xl border-2 border-[#111111] dark:border-stone-500 bg-[#FFFDF7] dark:bg-[#262933] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] text-xs font-extrabold text-[#111111] dark:text-white';

/** Čip osoby (iniciály, jméno, volitelně stavový štítek); s `onClick` je to tlačítko, jinak jen popisek. */
export const PersonChip: React.FC<{
  name: string;
  status?: EngagementStatus;
  muted?: boolean;
  onClick?: () => void;
}> = ({ name, status, muted = false, onClick }) => {
  const cls = `${chipBase} ${muted ? 'opacity-60' : ''}`;
  const content = (
    <>
      <span className="w-7 h-7 rounded-full border-2 border-[#111111] bg-[#FEF08A] text-[#111111] text-[10px] font-bold flex items-center justify-center shrink-0">
        {initials(name)}
      </span>
      <span className="truncate max-w-[11rem]">{name}</span>
      {status && (
        <span
          className={`px-2 py-0.5 rounded-full border-2 border-[#111111] dark:border-stone-400 text-[10px] font-extrabold ${STATUS_CLS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${name} – zobrazit detail`}
      className={`${cls} hover:bg-[#FEF08A] dark:hover:bg-[#323644] cursor-pointer transition-colors`}
    >
      {content}
    </button>
  ) : (
    <span className={cls}>{content}</span>
  );
};

const mutedCls = 'text-xs font-semibold text-stone-600 dark:text-stone-400';

export const InterestedList: React.FC<InterestedListProps> = ({ job, onChanged, showHeading = false }) => {
  const [items, setItems] = useState<EngagementForPoster[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EngagementForPoster | null>(null);
  const reqId = useRef(0);
  const isOffer = job.jobType === 'craftsman_available';
  const count = job.interestedCount;

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setError('');
    try {
      const data = await api<{ engagements: EngagementForPoster[] }>(
        `/api/jobs/${encodeURIComponent(job.id)}/engagements`
      );
      if (id === reqId.current) setItems(data.engagements);
    } catch (err) {
      if (id === reqId.current) setError(err instanceof ApiError ? err.message : 'Zájemce se nepodařilo načíst.');
    }
  }, [job.id]);

  useEffect(() => {
    if (count === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, count]);

  return (
    <div>
      {showHeading && (
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
          Zájemci ({count})
        </div>
      )}
      {count === 0 && !(items && items.length > 0) ? (
        <p className={mutedCls}>Zatím žádný zájemce.</p>
      ) : error && items === null ? (
        <ErrorBox message={error} onRetry={() => void load()} />
      ) : items === null ? (
        <p className={mutedCls}>Načítám zájemce…</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((x) => (
            <li key={x.id}>
              <PersonChip
                name={x.worker.name}
                status={isOffer ? undefined : x.status}
                muted={x.status === 'declined' || x.status === 'withdrawn'}
                onClick={() => setSelected(x)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <EngagementDetailModal
          job={job}
          engagement={selected}
          onClose={() => setSelected(null)}
          onDecided={(e) => {
            setItems((prev) => (prev ? prev.map((x) => (x.id === e.id ? e : x)) : prev));
            setSelected(e);
            onChanged();
          }}
        />
      )}
    </div>
  );
};
