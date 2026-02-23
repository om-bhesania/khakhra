import SchemeForm from "./components/SchemeForm";
import SchemeTable from "./components/SchemeTable";

export { SchemeForm as SchemeAdd };

export const SchemeView = () => {
  return (
    <div className="space-y-4">
      <SchemeTable />
    </div>
  );
};
