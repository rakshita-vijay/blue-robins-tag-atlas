"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="loginShell">
      <div className="loginCard">
        <h1>Tag Atlas</h1>
        <p className="muted">
          Store your project write-ups once. Click the tags that matter and
          find them again instantly — no more scrolling through folders.
        </p>

        {status === "sent" ? (
          <p>
            Check <strong>{email}</strong> for a sign-in link, then come back
            to this tab.
          </p>
        ) : (
          <form className="form" onSubmit={sendLink}>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="button" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </button>
            {status === "error" ? <p className="errorMsg">{errorMsg}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
