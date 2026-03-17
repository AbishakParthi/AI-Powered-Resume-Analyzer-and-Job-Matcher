import {Link} from "react-router";

const Navbar = () => {
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
            </div>
        </nav>
    )
}
export default Navbar
