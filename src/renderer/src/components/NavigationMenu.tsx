import { Link } from "@tanstack/react-router";

export default function NavigationMenu() {
    return (
        <nav>
            <ul className="flex gap-6 p-2 text-sm bg-slate-700">
                <li>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <Link to="/about">
                        Message Builder
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
