import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Demo auth: store token and redirect
    localStorage.setItem("authToken", "demo");
    navigate("/", { replace: true });
  }

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>
        <Button type="submit" className="w-full mt-2">Sign in</Button>
      </form>
      <p className="text-sm text-center mt-4">
        No account? <Link to="/register" className="underline">Register</Link>
      </p>
    </div>
  );
}

export default Login;


