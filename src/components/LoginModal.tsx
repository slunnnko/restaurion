'use client';

import React, { useState } from 'react';
import { OwnProfile } from '@/types/api';
import { api, ApiError } from '@/lib/api';
import { ModalShell, ErrorBox, FieldError, inputCls, labelCls, primaryBtn, secondaryBtn } from './ui';
import { Mail, KeyRound, Lock } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoggedIn: (user: OwnProfile) => void;
  onOpenVop: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoggedIn, onOpenVop }) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'code' | 'password' | 'reset'>('code');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      const data = await api<{ user: OwnProfile }>('/api/auth/login-password', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      onLoggedIn(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Přihlášení se nepodařilo.');
    } finally {
      setBusy(false);
    }
  };

  const requestCode = async (e: React.FormEvent | null, forReset = false) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await api<{ ok: true; testCode?: string }>('/api/auth/request-code', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setTestCode(res.testCode ?? '');
      if (res.testCode) setCode(res.testCode);
      if (forReset) setMode('reset');
      setStep('code');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Kód se nepodařilo odeslat.');
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!consent) {
      setError('Pro přihlášení je nutný souhlas s VOP a zpracováním osobních údajů.');
      return;
    }
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      const data = await api<{ user: OwnProfile }>('/api/auth/verify-code', {
        method: 'POST',
        body: {
          email: email.trim(),
          code: code.trim(),
          consent: true,
          directoryVisible,
          ...(mode === 'reset' ? { newPassword } : {}),
        },
      });
      onLoggedIn(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Přihlášení se nepodařilo.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md" labelledBy="login-title">
      <div className="mb-4 pr-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF08A] border border-[#111111] text-xs font-extrabold uppercase tracking-wider text-[#111111] mb-1.5">
          Přihlášení
        </span>
        <h2 id="login-title" className="font-serif text-xl font-bold text-[#111111] dark:text-white">
          {step === 'email'
            ? mode === 'password'
              ? 'Přihlas se heslem'
              : 'Přihlas se e-mailem'
            : mode === 'reset'
              ? 'Obnova hesla'
              : 'Zadej kód z e-mailu'}
        </h2>
        <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-1">
          {step === 'email'
            ? mode === 'password'
              ? 'Heslo si nastavíš v profilu po prvním přihlášení kódem.'
              : 'Pošleme ti 6místný kód. Heslo nepotřebuješ, účet se vytvoří automaticky.'
            : `Poslali jsme ho na ${email.trim()}.`}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={mode === 'password' ? loginWithPassword : (e) => void requestCode(e)} className="space-y-3.5">
          <div role="group" aria-label="Způsob přihlášení" className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border-2 border-[#111111] dark:border-stone-500">
            {(
              [
                ['code', 'Kód e-mailem'],
                ['password', 'Heslo'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setError('');
                  setFieldErrors({});
                }}
                className={`h-9 rounded-lg text-xs font-extrabold cursor-pointer ${
                  mode === value
                    ? 'bg-[#FEF08A] text-[#111111] border-2 border-[#111111]'
                    : 'text-[#111111] dark:text-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="login-email" className={labelCls}>
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="jmeno@domena.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>
          {mode === 'password' && (
            <div>
              <label htmlFor="login-password" className={labelCls}>
                Heslo
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
          )}
          {error && <ErrorBox message={error} />}
          <div className="flex flex-wrap justify-between items-center gap-2.5 pt-1">
            {mode === 'password' ? (
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => void requestCode(null, true)}
                className="text-xs font-extrabold underline underline-offset-2 text-[#111111] dark:text-stone-200 cursor-pointer disabled:opacity-50"
              >
                Zapomenuté heslo?
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className={secondaryBtn}>
                Zrušit
              </button>
              <button
                type="submit"
                disabled={busy || !email.trim() || (mode === 'password' && !password)}
                className={primaryBtn}
              >
                {mode === 'password' ? (busy ? 'Přihlašuji…' : 'Přihlásit') : busy ? 'Odesílám…' : 'Poslat kód'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3.5">
          {testCode && (
            <div role="status" className="p-3 rounded-xl bg-[#FEF08A] border-2 border-[#111111] text-xs font-extrabold text-[#111111]">
              Testovací režim: tvůj kód je {testCode}
            </div>
          )}
          <div>
            <label htmlFor="login-code" className={labelCls}>
              6místný kód
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} pl-10 tracking-[0.4em]`}
              />
            </div>
            <FieldError message={fieldErrors.code} />
          </div>

          {mode === 'reset' && (
            <div>
              <label htmlFor="login-new-password" className={labelCls}>
                Nové heslo
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-stone-300 pointer-events-none" />
                <input
                  id="login-new-password"
                  type="password"
                  required
                  minLength={10}
                  maxLength={200}
                  autoComplete="new-password"
                  placeholder="Alespoň 10 znaků"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
              <FieldError message={fieldErrors.newPassword} />
            </div>
          )}

          <label className="flex items-start gap-2.5 text-xs font-bold text-[#111111] dark:text-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[#111111] dark:accent-[#FEF08A] cursor-pointer"
            />
            <span>
              Souhlasím s{' '}
              <button
                type="button"
                onClick={onOpenVop}
                className="underline underline-offset-2 font-extrabold cursor-pointer"
              >
                VOP
              </button>{' '}
              a se zpracováním osobních údajů
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs font-bold text-[#111111] dark:text-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={directoryVisible}
              onChange={(e) => setDirectoryVisible(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[#111111] dark:accent-[#FEF08A] cursor-pointer"
            />
            <span>Můj profil bude vidět v Adresáři (odškrtnutím ho skryješ, zapnout lze v profilu)</span>
          </label>

          {error && <ErrorBox message={error} />}

          <div className="flex flex-wrap justify-between items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setMode(mode === 'reset' ? 'password' : mode);
                setNewPassword('');
                setCode('');
                setTestCode('');
                setError('');
                setFieldErrors({});
              }}
              className="text-xs font-extrabold underline underline-offset-2 text-[#111111] dark:text-stone-200 cursor-pointer"
            >
              Jiný e-mail
            </button>
            <button type="submit" disabled={busy || code.length !== 6 || (mode === 'reset' && newPassword.length < 10)} className={primaryBtn}>
              {busy ? 'Ověřuji…' : 'Přihlásit'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};
