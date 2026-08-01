'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getApiBase, setApiBase, setToken } from '@/lib/auth';
import { Icon } from './Icon';

export function LoginForm() {
  const router = useRouter();
  const [apiBase, setApiBaseValue] = useState(() => typeof window === 'undefined' ? 'http://localhost:3000' : getApiBase());
  const [phone, setPhone] = useState('+919999999999');
  const [name, setName] = useState('Designer Demo');
  const [otp, setOtp] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setApiBase(apiBase);
      const result = await api.requestOtp(phone.trim());
      setDevelopmentOtp(result.developmentOtp ?? null);
      if (result.developmentOtp) setOtp(result.developmentOtp);
      setStep('otp');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to request OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api.verifyOtp(phone.trim(), otp.trim(), name.trim() || undefined);
      setToken(result.token);
      router.push('/studio');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-row">
          <img src="/logo-mark.svg" alt="" width={42} height={42} />
          <div>
            <strong>PropertyTour360</strong>
            <span>Interior Designer Studio</span>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Design from verified space</p>
          <h1>Turn captured rooms into client-ready interior concepts.</h1>
          <p>Correct the measured shell, place furniture, apply materials, generate a web model and share a clear design proposal with your customer.</p>
        </div>
        <div className="login-feature-grid">
          <article><Icon name="grid"/><strong>2D plan editing</strong><span>Move wall vertices and verify dimensions.</span></article>
          <article><Icon name="cube"/><strong>Live 3D preview</strong><span>See every model change immediately.</span></article>
          <article><Icon name="history"/><strong>Versioned proposals</strong><span>Keep each customer revision auditable.</span></article>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">Designer access</p>
          <h2>{step === 'phone' ? 'Sign in to your workspace' : 'Enter verification code'}</h2>
          <p className="muted">Connects to your PropertyTour360 Node API. Development mode can return the OTP directly.</p>

          {step === 'phone' ? (
            <form onSubmit={requestOtp} className="form-stack">
              <label>
                Backend API address
                <input value={apiBase} onChange={(event) => setApiBaseValue(event.target.value)} placeholder="http://localhost:3000" required />
              </label>
              <label>
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Interior designer" />
              </label>
              <label>
                Mobile number
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="+919999999999" required />
              </label>
              {error && <div className="form-error"><Icon name="warning" size={18}/>{error}</div>}
              <button className="button button-primary button-large" disabled={busy}>
                {busy ? <Icon name="spinner" className="spin"/> : <Icon name="chevron"/>}
                Request OTP
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="form-stack">
              <label>
                Verification code
                <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus required />
              </label>
              {developmentOtp && <div className="dev-otp">Development OTP: <strong>{developmentOtp}</strong></div>}
              {error && <div className="form-error"><Icon name="warning" size={18}/>{error}</div>}
              <button className="button button-primary button-large" disabled={busy || otp.length !== 6}>
                {busy ? <Icon name="spinner" className="spin"/> : <Icon name="check"/>}
                Sign in
              </button>
              <button type="button" className="button button-ghost" onClick={() => setStep('phone')}>Change mobile number</button>
            </form>
          )}
          <a className="demo-link" href="/studio/demo"><Icon name="eye" size={18}/> Open the studio with local demo data</a>
        </div>
      </section>
    </main>
  );
}
