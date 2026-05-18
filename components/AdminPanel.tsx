"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { PnevmaMark } from "@/components/ToolIcons";
import { getLocale } from "@/locales";

type RequestLogEntry = {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  url: string;
  status: number;
  userAgent: string;
};

function basicToken(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

export function AdminPanel() {
  const { lang } = useAppSettings();
  const labels = useMemo(() => getLocale(lang).common, [lang]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLogs(nextToken = token) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/logs", {
        method: "POST",
        headers: {
          Authorization: `Basic ${nextToken}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        setError(labels.adminAuthFailed);
        setToken("");
        return;
      }

      if (!response.ok) {
        setError(`${labels.adminLoadFailed}: ${response.status}`);
        return;
      }

      const payload = (await response.json()) as { logs?: RequestLogEntry[] };
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      setToken(nextToken);
    } catch {
      setError(labels.adminLoadFailed);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadLogs(basicToken(username, password));
  }

  function logout() {
    setToken("");
    setPassword("");
    setLogs([]);
    setError("");
  }

  return (
    <main className="app admin-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <PnevmaMark />
          </div>
          <div>
            <h1>{labels.adminTitle}</h1>
            <p className="subhead">{labels.adminSubtitle}</p>
          </div>
        </div>
      </header>

      <section className="panel panel-pad admin-panel">
        <p className="data-note">{labels.adminReadOnly}</p>

        {!token ? (
          <form className="admin-login" onSubmit={submit}>
            <label>
              <span>{labels.adminUsername}</span>
              <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              <span>{labels.adminPassword}</span>
              <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button" type="submit" disabled={loading}>
              {loading ? labels.loading : labels.adminSignIn}
            </button>
          </form>
        ) : (
          <div className="button-row">
            <button className="button" type="button" onClick={() => void loadLogs()} disabled={loading}>
              {loading ? labels.loading : labels.adminRefresh}
            </button>
            <button className="button secondary" type="button" onClick={logout}>
              {labels.adminLogout}
            </button>
          </div>
        )}

        {error ? <div className="error">{error}</div> : null}
        <p className="small">{labels.adminStorageNote}</p>

        <div className="admin-log-table-wrap">
          <table className="admin-log-table">
            <thead>
              <tr>
                <th>{labels.adminTimestamp}</th>
                <th>{labels.adminIp}</th>
                <th>{labels.adminMethod}</th>
                <th>{labels.adminStatus}</th>
                <th>{labels.adminUrl}</th>
                <th>{labels.adminUserAgent}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? logs.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.ip}</td>
                  <td>{entry.method}</td>
                  <td>{entry.status}</td>
                  <td className="admin-url-cell">{entry.url}</td>
                  <td>{entry.userAgent}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>{labels.adminNoLogs}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
