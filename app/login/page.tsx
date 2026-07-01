"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Welcome back</h1>

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 mb-3 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 mb-3 rounded bg-gray-700 text-white placeholder-gray-400"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full p-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </div>
    </div>
  );
}