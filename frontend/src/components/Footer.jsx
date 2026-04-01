export default function Footer() {
    return (
        <footer className="footer" id="site-footer">
            <div className="footer-inner">
                <span>© {new Date().getFullYear()} SBT Academic Credentials. Built on blockchain.</span>
                <div className="footer-links">
                    <a href="https://ethereum.org" target="_blank" rel="noopener noreferrer">
                        Ethereum
                    </a>
                    <a href="https://docs.openzeppelin.com/" target="_blank" rel="noopener noreferrer">
                        OpenZeppelin
                    </a>
                    <a href="https://ipfs.tech/" target="_blank" rel="noopener noreferrer">
                        IPFS
                    </a>
                </div>
            </div>
        </footer>
    );
}
