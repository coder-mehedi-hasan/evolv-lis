import { Moon } from "lucide-react";
import { Button } from "./ui/button";
import { toggleTheme } from "@renderer/helpers/theme_helpers";

export default function ToggleTheme() {
    return (
        <Button onClick={toggleTheme} size="icon">
            <Moon size={16} />
        </Button>
    );
}
