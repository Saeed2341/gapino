"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiSmartphone,
  FiArrowLeft,
  FiAlertCircle,
  FiEdit2,
  FiRefreshCw,
  FiLoader,
} from "react-icons/fi";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import CodeInput from "@/components/CodeInput";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^09\d{9}$/;
export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [step, setStep] = useState("phone"); // "email" | "code"
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // اگر از قبل لاگین بود، برو صفحه اصلی
  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [authLoading, user, router]);

  // شمارش معکوس ارسال مجدد
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const sendCode = async (e) => {
    e?.preventDefault?.();
    if (!PHONE_REGEX.test(phone.trim())) {
      setError("لطفاً شماره موبایل معتبر وارد کن (مثل 09123456789)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/request-code", { phone: phone.trim() });
      setStep("code");
      setResendIn(60);
      setCode("");
      setCodeKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (finalCode) => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/api/auth/verify-code", {
        phone: phone.trim(),
        code: finalCode,
      });
      login(data);
      router.replace("/");
    } catch (err) {
      setError(err.message);
      setCode("");
      setCodeKey((k) => k + 1); // ریست باکس‌ها + فوکوس خودکار
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/request-code", { phone: phone.trim() });
      setResendIn(60);
      setCode("");
      setCodeKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-gray-50 to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-cyan-950/30">
      <div className="absolute top-5 left-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 dark:border-gray-800 p-6 sm:p-10">
          {/* هدر کارت */}
          <div className="flex flex-col items-center text-center mb-8">
            <Logo size={72} />
            <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
              گپینو
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {step === "phone"
                ? "برای ورود یا ثبت‌نام، شماره همراه خود را وارد کن"
                : "کد ۶ رقمی ارسال‌شده به شماره همراهت را وارد کن"}
            </p>
          </div>

          {/* خطا */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle className="shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {step === "phone" ? (
            /* ── مرحله ۱: ایمیل ── */
            <form onSubmit={sendCode} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                شماره موبایل
              </label>
              <div className="relative">
                <FiSmartphone
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="tel"
                  dir="ltr"
                  autoFocus
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 pr-11 pl-4 text-left text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition duration-150 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <FiLoader className="animate-spin" size={20} />
                ) : (
                  <FiArrowLeft size={20} />
                )}
                دریافت کد ورود
              </button>
            </form>
          ) : (
            /* ── مرحله ۲: کد ── */
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
                <span
                  dir="ltr"
                  className="text-sm text-gray-600 dark:text-gray-300"
                >
                  {phone}
                </span>
                <button
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600 transition duration-150"
                >
                  <FiEdit2 size={14} />
                  تغییر
                </button>
              </div>

              <CodeInput
                key={codeKey}
                value={code}
                onChange={setCode}
                onComplete={verifyCode}
                disabled={loading}
              />

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                  <FiLoader className="animate-spin" size={18} />
                  در حال بررسی کد...
                </div>
              ) : (
                <button
                  onClick={() => verifyCode(code)}
                  disabled={code.length < 6}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition duration-150 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ورود به گپینو
                </button>
              )}

              <div className="text-center text-sm">
                {resendIn > 0 ? (
                  <p className="text-gray-400 dark:text-gray-500">
                    ارسال مجدد کد تا{" "}
                    <span className="font-bold text-gray-600 dark:text-gray-300">
                      {resendIn}
                    </span>{" "}
                    ثانیه دیگر
                  </p>
                ) : (
                  <button
                    onClick={resendCode}
                    className="inline-flex items-center gap-1.5 font-medium text-indigo-500 hover:text-indigo-600 transition duration-150"
                  >
                    <FiRefreshCw size={15} />
                    ارسال مجدد کد
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          ورود شما به معنای پذیرش قوانین گپینو است.
        </p>
      </div>
    </main>
  );
}
