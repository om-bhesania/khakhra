import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Demo: pretend user is registered and log them in
    localStorage.setItem("authToken", "demo");
    navigate("/", { replace: true });
  }

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4 text-center">Register</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </label>
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
        <Button type="submit" className="w-full mt-2">Create account</Button>
      </form>
      <p className="text-sm text-center mt-4">
        Have an account? <Link to="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}

export default Register;


