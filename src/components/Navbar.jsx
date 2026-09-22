import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav className="navbar">

            <Link
                to="/"
                className="logo"
            >
                INK<span>rush</span>
            </Link>

            <div className="nav-info">
                2–4 players · realtime
            </div>

        </nav>
    );
}

export default Navbar;