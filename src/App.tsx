import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import AppRoutes from "./layout/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
