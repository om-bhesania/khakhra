import { Button } from "@/components/ui/button";
import { initializeSystem } from "@/scripts/initializeAdmin";

function InitButton() {
  const handleInit = async () => {
    await initializeSystem();
  };
  return <Button onClick={handleInit}>Initialize Roles</Button>;
}

export default InitButton;
