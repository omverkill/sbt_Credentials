import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import VerifyCredential from './pages/VerifyCredential';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
    return (
        <Router>
            <Navbar />
            <main style={{ flex: 1 }}>
                <Routes>
                    <Route path="/" element={<VerifyCredential />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
            </main>
            <Footer />
        </Router>
    );
}
