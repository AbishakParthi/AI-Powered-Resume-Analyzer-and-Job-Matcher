import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

const Navbar = () => {
    const { auth } = usePuterStore();
    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">ABISHAK RESUMIND</p>
            </Link>
            <div className="flex gap-2">
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
        </nav>
    )
}
export default Navbar
