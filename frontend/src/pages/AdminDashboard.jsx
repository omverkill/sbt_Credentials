import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/contract';
import IssueForm from '../components/IssueForm';

export default function AdminDashboard() {
    // ── Auth state ──
    const [isLoggedIn, setIsLoggedIn] = useState(api.isAuthenticated());
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // ── Dashboard state ──
    const [credentials, setCredentials] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueLoading, setIssueLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // ── Fetch credentials ──
    const fetchCredentials = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const data = await api.getAllCredentials(p, 20);
            setCredentials(data.credentials);
            setTotalPages(data.totalPages);
            setTotal(data.total);
            setPage(data.page);
        } catch (err) {
            if (err.message === "Invalid or expired token" || err.message === "Missing or invalid Authorization header") {
                api.logout();
                setIsLoggedIn(false);
                setLoginError("Session expired. Please log in again.");
            } else {
                setMessage({ type: 'error', text: err.message });
            }
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        if (isLoggedIn) fetchCredentials();
    }, [isLoggedIn, fetchCredentials]);

    // ── Login ──
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');

        try {
            await api.login(loginForm.username, loginForm.password);
            setIsLoggedIn(true);
        } catch (err) {
            setLoginError(err.message || 'Login failed');
        } finally {
            setLoginLoading(false);
        }
    };

    // ── Issue credential ──
    const handleIssue = async (formData) => {
        setIssueLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const result = await api.issueCredential(formData);
            setMessage({
                type: 'success',
                text: `✅ Credential issued! Token ID: ${result.tokenId} — TX: ${result.transactionHash.substring(0, 18)}...`,
            });
            setShowIssueForm(false);
            fetchCredentials(page);
        } catch (err) {
            if (err.message === "Invalid or expired token" || err.message === "Missing or invalid Authorization header") {
                api.logout();
                setIsLoggedIn(false);
                setLoginError("Session expired. Please log in again.");
            } else {
                setMessage({ type: 'error', text: err.message });
            }
        } finally {
            setIssueLoading(false);
        }
    };

    // ── Revoke ──
    const handleRevoke = async (tokenId) => {
        if (!confirm(`Revoke credential #${tokenId}? This cannot be undone.`)) return;

        try {
            await api.revokeCredential(tokenId);
            setMessage({
                type: 'success',
                text: `Credential #${tokenId} revoked successfully.`,
            });
            fetchCredentials(page);
        } catch (err) {
            if (err.message === "Invalid or expired token" || err.message === "Missing or invalid Authorization header") {
                api.logout();
                setIsLoggedIn(false);
                setLoginError("Session expired. Please log in again.");
            } else {
                setMessage({ type: 'error', text: err.message });
            }
        }
    };

    // ── Login Screen ──
    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h2>🔐 Admin Login</h2>
                    <p className="subtitle">Sign in to manage academic credentials</p>

                    {loginError && (
                        <div className="alert alert-error">
                            <span>⚠️</span> {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} id="login-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                                placeholder="admin"
                                required
                                id="login-username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                                placeholder="••••••••"
                                required
                                id="login-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={loginLoading}
                            id="login-submit"
                        >
                            {loginLoading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ── Dashboard ──
    const activeCount = credentials.filter((c) => !c.isRevoked).length;
    const revokedCount = credentials.filter((c) => c.isRevoked).length;

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="section-title">Admin Dashboard</h1>
                    <p className="section-subtitle">Manage academic credential SBTs</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowIssueForm(true)}
                    id="btn-issue-new"
                >
                    + Issue New Credential
                </button>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-value">{total}</div>
                    <div className="stat-label">Total Issued</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{activeCount}</div>
                    <div className="stat-label">Active (This Page)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{revokedCount}</div>
                    <div className="stat-label">Revoked (This Page)</div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-center">
                    <div className="spinner spinner-lg" />
                    <span>Loading credentials...</span>
                </div>
            ) : credentials.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📜</div>
                    <p>No credentials issued yet.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        Click "Issue New Credential" to get started.
                    </p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table id="credentials-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Holder</th>
                                    <th>IPFS Hash</th>
                                    <th>Issued</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {credentials.map((cred) => (
                                    <tr key={cred.tokenId}>
                                        <td><strong>#{cred.tokenId}</strong></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            {cred.holder.substring(0, 8)}...{cred.holder.substring(cred.holder.length - 6)}
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            {cred.ipfsHash.substring(0, 12)}...
                                        </td>
                                        <td>{new Date(cred.issuedAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`credential-status ${cred.isRevoked ? 'revoked' : 'valid'}`}>
                                                {cred.isRevoked ? '❌ Revoked' : '✅ Valid'}
                                            </span>
                                        </td>
                                        <td>
                                            {!cred.isRevoked && (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleRevoke(cred.tokenId)}
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                            {cred.isRevoked && cred.reissuedFrom === 0 && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    Revoked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page <= 1}
                                onClick={() => fetchCredentials(page - 1)}
                            >
                                ← Previous
                            </button>
                            <span className="page-info">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page >= totalPages}
                                onClick={() => fetchCredentials(page + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Issue Form Modal */}
            {showIssueForm && (
                <IssueForm
                    onSubmit={handleIssue}
                    onClose={() => setShowIssueForm(false)}
                    loading={issueLoading}
                />
            )}
        </div>
    );
}
