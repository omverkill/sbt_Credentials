import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../utils/contract';

export default function Navbar() {
    const navigate = useNavigate();
    const isLoggedIn = api.isAuthenticated();

    const handleLogout = () => {
        api.logout();
        navigate('/');
    };

    return (
        <nav className="navbar" id="main-nav">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-brand">
                    <span className="logo-icon">🔗</span>
                    <span>SBT Credentials</span>
                </NavLink>

                <ul className="navbar-links">
                    <li>
                        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                            Verify
                        </NavLink>
                    </li>
                    {isLoggedIn ? (
                        <>
                            <li>
                                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                                    Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className="btn btn-secondary btn-sm"
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <li>
                            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                                Admin
                            </NavLink>
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    );
}
