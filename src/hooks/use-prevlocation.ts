import { useRef, useEffect } from "react";
import { useLocation, type Location } from "react-router-dom";

function usePreviousLocation() {
  const location = useLocation();
  const prevLocationRef = useRef<Location | null>(null);

  useEffect(() => {
    prevLocationRef.current = location;
  }, [location]);

  return prevLocationRef.current;
}

export default usePreviousLocation;
