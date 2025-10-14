import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import usePreviousLocation from "@/hooks/use-prevlocation";
import { ArrowLeft, Home } from "lucide-react";
import { type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFound(): JSX.Element {
  const navigate = useNavigate(); 
  const previousLocation = usePreviousLocation();

  // Go back to previous route if possible, otherwise go home
  function handleBack() {
    // If there's history to go back to, use it — otherwise navigate home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  function handleHome() {
    navigate("/");
  }

  return (
    <div className="h-full md:min-h-svh flex items-center justify-center bg-background text-foreground p-4">
      <Card className="max-w-3xl w-full border-0 !shadow-none bg-card">
        <CardContent className="p-0 flex flex-col gap-8">
          <div className="flex-1">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              404
            </h1>
            <p className="mt-2 text-xl text-muted-foreground">Page not found</p>

            <p className="mt-4 text-muted-foreground">
              We couldn’t find{" "}
              <span className="font-medium text-foreground">
               the requested route
              </span>
              . It may have been moved or removed.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                onClick={handleBack}
                className="inline-flex items-center gap-2 cursor-pointer"
                variant="secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              <Button
                onClick={handleHome}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>

              <Link
                to="/"
                className="sm:ml-auto text-sm text-muted-foreground hover:text-foreground underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                Return to main site
              </Link>
            </div>

            <div className="mt-6 pt-4 border-t border-border text-muted-foreground text-sm">
              Tip: try checking the URL or go back to where you came from.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
