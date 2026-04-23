import { HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

export function AppHeader() {
  return (
    <header className="h-14 border-b border-border bg-card sticky top-0 z-50">
      <div className="h-full px-8 flex items-center justify-between max-w-[1344px] mx-auto">
        {/* Left: Logo + Product Name */}
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3 12h4l3 9 4-18 3 9h4"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-none">ML 성능평가</span>
            <span className="text-xs text-muted-foreground">ISO/IEC 4213 기반</span>
          </div>
        </div>

        {/* Right: Help Icon */}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
