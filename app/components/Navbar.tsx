import { Link } from "react-router";
import { useState } from "react";
import { usePuterStore } from "~/lib/puter";

const Navbar = () => {
    const { auth } = usePuterStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className="navbar relative">
            <div className="flex w-full items-center justify-between gap-4">
                <Link to="/" onClick={closeMenu}>
                    <p className="text-2xl font-bold text-gradient">ABISHAK RESUMIND</p>
                </Link>
                <button
                    type="button"
                    className="navbar-hamburger md:hidden"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-nav"
                    aria-label="Toggle navigation menu"
                    onClick={() => setMenuOpen((prev) => !prev)}
                >
                    <span className={menuOpen ? "hamburger-line hamburger-line-1 open" : "hamburger-line hamburger-line-1"} />
                    <span className={menuOpen ? "hamburger-line hamburger-line-2 open" : "hamburger-line hamburger-line-2"} />
                    <span className={menuOpen ? "hamburger-line hamburger-line-3 open" : "hamburger-line hamburger-line-3"} />
                </button>
                <div className="hidden md:flex gap-2">
                    <Link to="/upload" className="primary-button w-fit">
                        Upload Resume
                    </Link>
                    <Link to="/ai-resume-builder" className="primary-button w-fit">
                        AI Builder
                    </Link>
                    {auth.isAuthenticated && (
                        <button
                            type="button"
                            onClick={() => {
                                const ok = window.confirm("Are you sure you want to log out?");
                                if (!ok) return;
                                auth.signOut();
                            }}
                            className="primary-button w-fit"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>

            <div
                id="mobile-nav"
                className={menuOpen ? "navbar-mobile open" : "navbar-mobile"}
            >
                    <Link to="/upload" className="primary-button w-full" onClick={closeMenu}>
                        Upload Resume
                    </Link>
                    <Link to="/ai-resume-builder" className="primary-button w-full" onClick={closeMenu}>
                        AI Builder
                    </Link>
                    {auth.isAuthenticated && (
                        <button
                            type="button"
                            onClick={() => {
                                const ok = window.confirm("Are you sure you want to log out?");
                                if (!ok) return;
                                auth.signOut();
                                closeMenu();
                            }}
                            className="primary-button w-full"
                        >
                            Logout
                        </button>
                    )}
            </div>
        </nav>
    )
}
export default Navbar
