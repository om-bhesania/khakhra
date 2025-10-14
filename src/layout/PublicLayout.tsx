import { Outlet, Link } from "react-router-dom";

function PublicLayout() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center mb-4 font-semibold">
          Inventory Management System
        </Link> a
        <Outlet />
      </div>
    </div>
  );
}

export default PublicLayout;
