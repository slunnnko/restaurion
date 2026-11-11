'use client';

import React from 'react';
import { ModalShell } from './ui';
import { MyListings } from './MyListings';

interface MyListingsModalProps {
  onClose: () => void;
  /** Po změně inzerátu, aby si nástěnka obnovila data. */
  onChanged: () => void;
  onNeedProfile?: () => void;
}

export const MyListingsModal: React.FC<MyListingsModalProps> = ({ onClose, onChanged, onNeedProfile }) => (
  <ModalShell onClose={onClose} maxWidth="max-w-2xl" labelledBy="admin-title">
    <div className="mb-4 pr-10">
      <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
        Administrace
      </span>
      <h2 id="admin-title" className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
        Moje inzeráty
      </h2>
    </div>
    <MyListings onChanged={onChanged} onNeedProfile={onNeedProfile} />
  </ModalShell>
);
