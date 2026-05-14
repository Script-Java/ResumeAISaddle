"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Check your email for a confirmation link (if enabled), or just sign in now!", { duration: 5000 });
        setActiveTab("login"); // Switch back to login
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] overflow-y-auto overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Background with nodes - Removed per request */}

      <div className="relative z-10 w-full px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-[400px]">
          {/* Main Card */}
          <div className="p-8 md:p-10 bg-[#121212] border border-[#2A2A2A] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-300">
            
            {/* Top Logo Icon */}
            <div className="flex justify-center mb-6">
               <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-xl font-semibold text-white mb-2 tracking-tight">
                {activeTab === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-[#888888] text-sm flex items-center justify-center gap-1">
                {activeTab === "login" ? "Don't have an account yet?" : "Already have an account?"}
                <button 
                  onClick={() => {
                    setActiveTab(activeTab === "login" ? "signup" : "login");
                    setError(null);
                  }}
                  className="text-white hover:text-[#0070F3] transition-colors font-medium ml-1"
                >
                  {activeTab === "login" ? "Sign up" : "Log in"}
                </button>
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6 text-center animate-pulse">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#666666] group-focus-within:text-[#0070F3] transition-colors" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-[#666666] focus:outline-none focus:border-[#0070F3] focus:bg-[#202020] transition-all text-sm font-medium"
                  placeholder="email address"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#666666] group-focus-within:text-[#0070F3] transition-colors" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-[#666666] focus:outline-none focus:border-[#0070F3] focus:bg-[#202020] transition-all text-sm font-medium"
                  placeholder="Password"
                />
              </div>

              {activeTab === "signup" && (
                <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#666666] group-focus-within:text-[#0070F3] transition-colors" />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-[#666666] focus:outline-none focus:border-[#0070F3] focus:bg-[#202020] transition-all text-sm font-medium"
                    placeholder="Confirm Password"
                  />
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#0070F3] text-white py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-[#0070F3]/90 hover:shadow-[0_0_20px_rgba(0,112,243,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {loading ? "Processing..." : activeTab === "login" ? "Login" : "Sign Up"}
                </button>
              </div>
              

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
