import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, PasswordAccount, PasswordHistoryItem } from '../types';
import { supabase } from '../services/supabase';

interface PasswordVaultProps {
  user: User | null;
  onClose: () => void;
}

// Secure random generator using Web Crypto API
const generateSecurePassword = (options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}): string => {
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let pool = '';
  const guaranteed: string[] = [];

  if (options.useUpper) {
    pool += UPPER;
    guaranteed.push(UPPER[Math.floor(Math.random() * UPPER.length)]);
  }
  if (options.useLower) {
    pool += LOWER;
    guaranteed.push(LOWER[Math.floor(Math.random() * LOWER.length)]);
  }
  if (options.useNumbers) {
    pool += NUMBERS;
    guaranteed.push(NUMBERS[Math.floor(Math.random() * NUMBERS.length)]);
  }
  if (options.useSymbols) {
    pool += SYMBOLS;
    guaranteed.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }

  // Fallback to letters if nothing selected
  if (!pool) {
    pool = LOWER + NUMBERS;
    guaranteed.push(LOWER[0]);
  }

  const remaining = Math.max(0, options.length - guaranteed.length);
  const randomBytes = new Uint32Array(remaining);
  crypto.getRandomValues(randomBytes);

  const resultChars = [...guaranteed];
  for (let i = 0; i < remaining; i++) {
    const idx = randomBytes[i] % pool.length;
    resultChars.push(pool[idx]);
  }

  // Fisher-Yates shuffle
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
  }

  return resultChars.join('');
};

const calculateStrength = (pwd: string): { label: string; score: number; color: string } => {
  if (!pwd) return { label: 'Empty', score: 0, color: 'bg-slate-300' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 14) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { label: 'Weak', score: 1, color: 'bg-rose-500' };
  if (score === 3) return { label: 'Good', score: 2, color: 'bg-amber-500' };
  if (score === 4) return { label: 'Strong', score: 3, color: 'bg-indigo-500' };
  return { label: 'Very Strong', score: 4, color: 'bg-emerald-500' };
};

const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

export const PasswordVault: React.FC<PasswordVaultProps> = ({ user, onClose }) => {
  const [accounts, setAccounts] = useState<PasswordAccount[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Add Account Modal State
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newService, setNewService] = useState('');
  const [newInitialPass, setNewInitialPass] = useState('');

  // New Password input per card
  const [activeNewPassCardId, setActiveNewPassCardId] = useState<string | null>(null);
  const [newPassInput, setNewPassInput] = useState('');

  // Password visibility set (account_id + item_id)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const copyToClipboard = (text: string, type: 'email' | 'password') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    triggerToast(type === 'email' ? '✅ Email copied!' : '🔑 Password copied!');
  };

  const toggleReveal = (key: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Generate on options change
  const handleRegenerate = useCallback(() => {
    const pwd = generateSecurePassword({
      length: genLength,
      useUpper: genUpper,
      useLower: genLower,
      useNumbers: genNumbers,
      useSymbols: genSymbols,
    });
    setGeneratedPassword(pwd);
  }, [genLength, genUpper, genLower, genNumbers, genSymbols]);

  useEffect(() => {
    handleRegenerate();
  }, [handleRegenerate]);

  // Load accounts from Supabase or LocalStorage
  useEffect(() => {
    const loadVaultData = async () => {
      if (user) {
        const { data } = await supabase
          .from('notekita_notes')
          .select('*')
          .eq('user_id', user.id)
          .eq('category', '__vault_password__')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const loaded: PasswordAccount[] = data.map((d: any) => {
            let meta: any = {};
            try {
              meta = JSON.parse(d.content);
            } catch {
              meta = { history: [], service: '' };
            }

            return {
              id: d.id,
              email: d.title,
              service: meta.service || '',
              history: Array.isArray(meta.history) ? meta.history : [],
              createdAt: new Date(d.created_at).getTime(),
              updatedAt: new Date(d.updated_at || d.created_at).getTime(),
            };
          });
          setAccounts(loaded);
          return;
        }
      }

      // Fallback local storage
      const cached = localStorage.getItem('notekita_vault_accounts');
      if (cached) {
        try {
          setAccounts(JSON.parse(cached));
        } catch {
          setAccounts([]);
        }
      }
    };

    loadVaultData();
  }, [user]);

  // Save changes to Supabase and LocalStorage
  const syncAccount = async (account: PasswordAccount) => {
    if (user) {
      const payload = {
        user_id: user.id,
        title: account.email,
        content: JSON.stringify({
          service: account.service || '',
          history: account.history,
        }),
        category: '__vault_password__',
        is_private: true,
      };

      if (account.id.startsWith('local_')) {
        const { data } = await supabase.from('notekita_notes').insert([payload]).select().single();
        if (data) {
          setAccounts((prev) =>
            prev.map((a) => (a.id === account.id ? { ...a, id: data.id } : a))
          );
        }
      } else {
        await supabase
          .from('notekita_notes')
          .update({
            title: payload.title,
            content: payload.content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
      }
    }
  };

  const deleteAccountDb = async (accountId: string) => {
    if (user && !accountId.startsWith('local_')) {
      await supabase.from('notekita_notes').delete().eq('id', accountId);
    }
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;

    const initialHistory: PasswordHistoryItem[] = newInitialPass.trim()
      ? [{ id: 'pwd_' + Date.now(), password: newInitialPass.trim(), createdAt: Date.now() }]
      : [];

    const newAcc: PasswordAccount = {
      id: 'local_' + Date.now(),
      email,
      service: newService.trim() || undefined,
      history: initialHistory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newAcc, ...accounts];
    setAccounts(updated);
    localStorage.setItem('notekita_vault_accounts', JSON.stringify(updated));

    await syncAccount(newAcc);

    setNewEmail('');
    setNewService('');
    setNewInitialPass('');
    setIsAddAccountOpen(false);
    triggerToast('Account added to Vault');
  };

  // Add New Password to Account (Recent to Old)
  const handleAddPasswordToAccount = async (accountId: string) => {
    const password = newPassInput.trim();
    if (!password) return;

    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    const newItem: PasswordHistoryItem = {
      id: 'pwd_' + Date.now(),
      password,
      createdAt: Date.now(),
    };

    // Prepend to history so recent is always first
    const updatedAccount: PasswordAccount = {
      ...target,
      history: [newItem, ...target.history],
      updatedAt: Date.now(),
    };

    const updatedList = accounts.map((a) => (a.id === accountId ? updatedAccount : a));
    setAccounts(updatedList);
    localStorage.setItem('notekita_vault_accounts', JSON.stringify(updatedList));

    await syncAccount(updatedAccount);

    setNewPassInput('');
    setActiveNewPassCardId(null);
    triggerToast('Password added to history');
  };

  // Delete Password Item from History
  const handleDeletePasswordItem = async (accountId: string, historyItemId: string) => {
    if (!window.confirm('Delete this historical password?')) return;

    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    const updatedAccount: PasswordAccount = {
      ...target,
      history: target.history.filter((h) => h.id !== historyItemId),
      updatedAt: Date.now(),
    };

    const updatedList = accounts.map((a) => (a.id === accountId ? updatedAccount : a));
    setAccounts(updatedList);
    localStorage.setItem('notekita_vault_accounts', JSON.stringify(updatedList));

    await syncAccount(updatedAccount);
    triggerToast('Password entry removed');
  };

  // Delete Entire Account
  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!window.confirm(`Delete account "${email}" and all its password history?`)) return;

    const updatedList = accounts.filter((a) => a.id !== accountId);
    setAccounts(updatedList);
    localStorage.setItem('notekita_vault_accounts', JSON.stringify(updatedList));

    await deleteAccountDb(accountId);
    triggerToast('Account deleted');
  };

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.email.toLowerCase().includes(q) || a.service?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const strength = calculateStrength(generatedPassword);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-full text-xs font-bold shadow-2xl animate-in zoom-in-95 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-xl font-bold font-serif italic tracking-tight">Password Vault</h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                  Secret Mode
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                Encrypted account credentials & password history
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Open Password Generator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              <span className="hidden sm:inline">Generator</span>
            </button>

            <button
              onClick={() => setIsAddAccountOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add Account</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors ml-1"
              title="Back to Notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-80">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search accounts or emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <span className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full shadow-sm">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
            </span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              Trigger command: <code className="text-indigo-500 font-mono">/pass</code>
            </span>
          </div>
        </div>

        {/* Account Cards Grid */}
        {filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAccounts.map((account) => {
              const isAddingPass = activeNewPassCardId === account.id;

              return (
                <div
                  key={account.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all space-y-4 relative group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {account.service && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                            {account.service}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                          {account.history.length} {account.history.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => copyToClipboard(account.email, 'email')}
                          title="Copy Email"
                          className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-slate-200/60 dark:border-zinc-700/60 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                          <span>Copy Email</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(account.id, account.email)}
                          title="Delete Account"
                          className="p-1.5 text-slate-300 dark:text-zinc-600 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate" title={account.email}>
                      {account.email}
                    </h2>
                  </div>

                  {/* Password History List (Recent to Old) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      <span>Password History</span>
                      <button
                        onClick={() => {
                          setActiveNewPassCardId(isAddingPass ? null : account.id);
                          setNewPassInput('');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{isAddingPass ? 'Cancel' : '+ New Password'}</span>
                      </button>
                    </div>

                    {/* Add New Password input for this card */}
                    {isAddingPass && (
                      <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 space-y-2 animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Enter new password..."
                            value={newPassInput}
                            onChange={(e) => setNewPassInput(e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setNewPassInput(generatedPassword)}
                            title="Paste generated password"
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-bold border border-amber-500/30 whitespace-nowrap"
                          >
                            Use Gen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPasswordToAccount(account.id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 whitespace-nowrap"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Historical Password Rows */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {account.history.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-600 italic py-2">
                          No passwords recorded yet. Click &quot;+ New Password&quot; to add one.
                        </p>
                      ) : (
                        account.history.map((item, idx) => {
                          const isLatest = idx === 0;
                          const revealKey = `${account.id}_${item.id}`;
                          const isRevealed = revealedIds.has(revealKey);

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                                isLatest
                                  ? 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-700/60'
                                  : 'bg-transparent border-slate-100 dark:border-zinc-800/60 opacity-80'
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center space-x-2">
                                  {isLatest && (
                                    <span className="text-[9px] font-black uppercase tracking-tight px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md">
                                      Latest
                                    </span>
                                  )}
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                                    {formatTimeAgo(item.createdAt)}
                                  </span>
                                </div>

                                <div className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                                  {isRevealed ? item.password : '••••••••••••••••'}
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(revealKey)}
                                  title={isRevealed ? 'Hide Password' : 'Show Password'}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-colors"
                                >
                                  {isRevealed ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.password, 'password')}
                                  title="Copy Password"
                                  className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                                  </svg>
                                </button>

                                {account.history.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePasswordItem(account.id, item.id)}
                                    title="Delete from history"
                                    className="p-1.5 text-slate-300 dark:text-zinc-600 hover:text-rose-500 rounded-lg transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-4 text-slate-300 dark:text-zinc-600 border border-slate-200/60 dark:border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {search ? 'No matching accounts found' : 'Your Vault is empty'}
            </h3>
            <p className="text-slate-400 dark:text-zinc-500 max-w-sm text-xs mb-6">
              {search
                ? 'Try searching with a different email address or service name.'
                : 'Create cards for email accounts to securely store and track previous passwords with timestamps.'}
            </p>
            <button
              onClick={() => setIsAddAccountOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              + Add First Account
            </button>
          </div>
        )}
      </main>

      {/* Password Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Password Generator</h3>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Generated Output Box */}
            <div className="bg-slate-50 dark:bg-zinc-800/80 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-sm md:text-base font-bold text-slate-900 dark:text-white break-all select-all">
                  {generatedPassword}
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  title="Generate New"
                  className="p-2 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-all shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>

              {/* Strength Indicator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Strength:</span>
                  <span className={strength.score >= 3 ? 'text-emerald-500' : 'text-amber-500'}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Length Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Length:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{genLength} chars</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={genLength}
                  onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="checkbox"
                    checked={genUpper}
                    onChange={(e) => setGenUpper(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Uppercase (A-Z)</span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="checkbox"
                    checked={genLower}
                    onChange={(e) => setGenLower(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Lowercase (a-z)</span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="checkbox"
                    checked={genNumbers}
                    onChange={(e) => setGenNumbers(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Numbers (0-9)</span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="checkbox"
                    checked={genSymbols}
                    onChange={(e) => setGenSymbols(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <div className="truncate">
                    <span>Symbols (!@#$%)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(generatedPassword, 'password')}
                className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                <span>Copy Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleAddAccount}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Account Card</h3>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email / Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. amir@mail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Service / Provider (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google, GitHub, Netflix, Work"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewInitialPass(generatedPassword)}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Paste Generated
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Paste or type password..."
                  value={newInitialPass}
                  onChange={(e) => setNewInitialPass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20"
              >
                Save Card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
