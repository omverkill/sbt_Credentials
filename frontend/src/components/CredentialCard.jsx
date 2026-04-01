export default function CredentialCard({ credential }) {
    const isRevoked = credential.isRevoked;
    const issueDate = credential.issuedAt
        ? new Date(credential.issuedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Unknown';

    return (
        <div className={`credential-card ${isRevoked ? 'revoked' : ''}`} id={`credential-${credential.tokenId}`}>
            <div className="credential-header">
                <span className="credential-id">Token #{credential.tokenId}</span>
                <span className={`credential-status ${isRevoked ? 'revoked' : 'valid'}`}>
                    {isRevoked ? '❌ Revoked' : '✅ Valid'}
                </span>
            </div>

            <div className="credential-body">
                {credential.studentName && <h3>{credential.studentName}</h3>}
                {credential.degree && <p className="degree">{credential.degree}</p>}

                <div className="credential-details">
                    {credential.institution && (
                        <div className="detail-item">
                            <span className="detail-label">Institution</span>
                            <span className="detail-value">{credential.institution}</span>
                        </div>
                    )}

                    {credential.graduationDate && (
                        <div className="detail-item">
                            <span className="detail-label">Completion Date</span>
                            <span className="detail-value">{
                                new Date(credential.graduationDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                }) !== 'Invalid Date' ? new Date(credential.graduationDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                }) : credential.graduationDate
                            }</span>
                        </div>
                    )}

                    <div className="detail-item">
                        <span className="detail-label">Issued</span>
                        <span className="detail-value">{issueDate}</span>
                    </div>

                    <div className="detail-item">
                        <span className="detail-label">Holder</span>
                        <span className="detail-value mono">{credential.holder}</span>
                    </div>

                    <div className="detail-item">
                        <span className="detail-label">IPFS Hash</span>
                        <span className="detail-value mono">{credential.ipfsHash}</span>
                    </div>

                    {credential.reissuedFrom > 0 && (
                        <div className="detail-item">
                            <span className="detail-label">Re-issued From</span>
                            <span className="detail-value">Token #{credential.reissuedFrom}</span>
                        </div>
                    )}

                    <div className="detail-item">
                        <span className="detail-label">Credential Hash</span>
                        <span className="detail-value mono">
                            {typeof credential.credentialHash === 'string'
                                ? credential.credentialHash.substring(0, 18) + '...'
                                : '—'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
