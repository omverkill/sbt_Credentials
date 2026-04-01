import { useState } from 'react';
import { api } from '../utils/contract';
import CredentialCard from '../components/CredentialCard';

export default function VerifyCredential() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('tokenId');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            if (searchType === 'tokenId') {
                const data = await api.verifyCredential(searchQuery.trim());
                setResult({ type: 'single', data });
            } else {
                const data = await api.getCredentialsByHolder(searchQuery.trim());
                setResult({ type: 'multiple', data });
            }
        } catch (err) {
            setError(err.message || 'Credential not found');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Hero */}
            <section className="hero">
                <div className="hero-badge">
                    <span>🔐</span> Blockchain-Verified Academic Credentials
                </div>
                <h1>Verify Academic Credentials</h1>
                <p>
                    Instantly verify the authenticity of academic credentials issued as
                    Soulbound Tokens on the blockchain. Tamper-proof. Permanent. Trustworthy.
                </p>

                <div className="property-badges">
                    <div className="property-badge">
                        <span className="badge-icon">✅</span> Verifiable
                    </div>
                    <div className="property-badge">
                        <span className="badge-icon">🛡️</span> Tamper-Proof
                    </div>
                    <div className="property-badge">
                        <span className="badge-icon">🌐</span> Accessible
                    </div>
                    <div className="property-badge">
                        <span className="badge-icon">🏛️</span> Institution-Aligned
                    </div>
                </div>
            </section>

            {/* Search */}
            <section className="page-section">
                <div className="container">
                    <div className="search-container">
                        <form onSubmit={handleSearch} id="verify-form">
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${searchType === 'tokenId' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSearchType('tokenId')}
                                    id="search-by-token"
                                >
                                    By Token ID
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${searchType === 'address' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSearchType('address')}
                                    id="search-by-address"
                                >
                                    By Wallet Address
                                </button>
                            </div>

                            <div className="search-box">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={
                                        searchType === 'tokenId'
                                            ? 'Enter Token ID (e.g., 1)'
                                            : 'Enter wallet address (0x...)'
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    id="search-input"
                                />
                                <button type="submit" className="btn btn-primary" disabled={loading} id="search-submit">
                                    {loading ? <span className="spinner" /> : '🔍 Verify'}
                                </button>
                            </div>
                        </form>

                        {/* Error */}
                        {error && (
                            <div className="alert alert-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {/* Results */}
                        {result?.type === 'single' && (
                            <CredentialCard credential={result.data} />
                        )}

                        {result?.type === 'multiple' && (
                            <div>
                                <p className="section-subtitle" style={{ marginBottom: '1rem' }}>
                                    Found {result.data.totalCredentials} credential
                                    {result.data.totalCredentials !== 1 ? 's' : ''} for this address
                                </p>
                                {result.data.credentials.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="icon">📭</div>
                                        <p>No credentials found for this address</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {result.data.credentials.map((cred) => (
                                            <CredentialCard key={cred.tokenId} credential={cred} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
