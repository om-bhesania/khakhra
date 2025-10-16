import { Outlet } from "react-router-dom";

function PublicLayout() {
  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
}

export default PublicLayout;
