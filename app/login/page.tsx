"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "check-email">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      if (!data.session) {
        setStatus("check-email");
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="loginShell">
      <div className="loginCard">
        <h1>Tag Atlas</h1>
        <p className="muted">
          Store your project write-ups once. Click the tags that matter and
          find them again instantly — no more scrolling through folders.
        </p>

        {status === "check-email" ? (
          <p>
            Almost done — check <strong>{email}</strong> for a confirmation
            link, click it, then come back and sign in.
          </p>
        ) : (
          <>
            <form className="form" onSubmit={handleSubmit}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="button" type="submit" disabled={status === "loading"}>
                {status === "loading"
                  ? "Please wait…"
                  : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
              </button>
              {status === "error" ? <p className="errorMsg">{errorMsg}</p> : null}
            </form>

            <p className="muted small" style={{ marginTop: 14 }}>
              {mode === "signin" ? (
                <>
                  No account yet?{" "}
                  <span
                    className="linkish"
                    onClick={() => {
                      setMode("signup");
                      setStatus("idle");
                      setErrorMsg("");
                    }}
                  >
                    Create one
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span
                    className="linkish"
                    onClick={() => {
                      setMode("signin");
                      setStatus("idle");
                      setErrorMsg("");
                    }}
                  >
                    Sign in
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
