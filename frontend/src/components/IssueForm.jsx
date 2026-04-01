import { useState } from 'react';

export default function IssueForm({ onSubmit, onClose, loading }) {
    const [formData, setFormData] = useState({
        holderAddress: '',
        studentName: '',
        degree: '',
        institution: '',
        graduationDate: '',
    });

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📜 Issue New Credential</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} id="issue-credential-form">
                    <div className="form-group">
                        <label className="form-label">Holder Wallet Address *</label>
                        <input
                            type="text"
                            name="holderAddress"
                            className="form-input"
                            placeholder="0x..."
                            value={formData.holderAddress}
                            onChange={handleChange}
                            required
                            id="input-holder-address"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Student Name *</label>
                        <input
                            type="text"
                            name="studentName"
                            className="form-input"
                            placeholder="Full name"
                            value={formData.studentName}
                            onChange={handleChange}
                            required
                            id="input-student-name"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Degree *</label>
                        <input
                            type="text"
                            name="degree"
                            className="form-input"
                            placeholder="e.g. B.Sc. Computer Science"
                            value={formData.degree}
                            onChange={handleChange}
                            required
                            id="input-degree"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Institution *</label>
                        <input
                            type="text"
                            name="institution"
                            className="form-input"
                            placeholder="University name"
                            value={formData.institution}
                            onChange={handleChange}
                            required
                            id="input-institution"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Graduation Date *</label>
                        <input
                            type="date"
                            name="graduationDate"
                            className="form-input"
                            value={formData.graduationDate}
                            onChange={handleChange}
                            required
                            id="input-graduation-date"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
                            {loading ? <><span className="spinner" /> Issuing...</> : '🔗 Issue Credential'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
