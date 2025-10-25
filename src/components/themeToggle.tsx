
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./themeProvider";
import { Switch } from "./ui/switch";

type ModeToggleProps = {
  variant?: "icon" | "switch";
};

export function ModeToggle({ variant = "icon" }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();

  // Determine if dark mode is active
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  if (variant === "switch") {
    return (
      <div className="flex items-center gap-3">
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={isDark}
          onCheckedChange={handleToggle}
          aria-label="Toggle theme"
        />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  // Icon variant (original dropdown behavior can be removed if not needed)
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
