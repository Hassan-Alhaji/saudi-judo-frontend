"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithDjango, verifyOTPWithDjango, clearAuthData } from "../lib/api";
import JudoLoader from "../components/JudoLoader";

export default function Home() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  
  const router = useRouter();
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleRequestOTP = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Requesting OTP for email:", email);
      const data = await loginWithDjango(email);
      if (data?.dev_otp_code) setDevOtp(data.dev_otp_code);
      setStep(2);
      setTimeLeft(180);
      setOtpCode("");
    } catch (error: any) {
      console.error("Login Error Catch Block:", error);
      clearAuthData();
      alert("فشل إرسال الرمز: " + (error.message || "تأكد من البريد الإلكتروني."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Verifying OTP for email:", email);
      const user = await verifyOTPWithDjango(email, otpCode);
      console.log("Login successful, user data:", user);
      
      console.log("Redirecting to /dashboard...");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Verify OTP Error:", error);
      clearAuthData();
      alert("فشل التحقق: " + (error.message || "الكود غير صحيح."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <Head>
        <title>منصة الاتحاد السعودي للجودو | تسجيل الدخول</title>
      </Head>
      {isLoading && <JudoLoader size="fullscreen" text="جاري التحقق من البيانات..." />}
      
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="الاتحاد السعودي للجودو" className="h-40 mb-2 object-contain" />
          <p className="mt-2 text-center text-sm text-gray-600">
            يرجى تسجيل الدخول للوصول إلى حسابك
          </p>
        </div>
        
        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleRequestOTP}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4">
                <label htmlFor="email-address" className="sr-only">
                  البريد الإلكتروني
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-600 focus:border-green-600 focus:z-10 sm:text-sm"
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:bg-green-300 transition-colors"
              >
                {isLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
              </button>
            </div>

            {/* Registration Link */}
            <div className="text-center mt-4">
              <span className="text-sm text-gray-600">ليس لديك حساب؟ </span>
              <Link href="/register" className="text-sm font-bold text-green-700 hover:text-green-800 transition">
                تسجيل حساب جديد
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4 relative">
                <label htmlFor="otp-code" className="sr-only">
                  رمز التحقق (OTP)
                </label>
                <input
                  id="otp-code"
                  name="otpCode"
                  type="text"
                  maxLength={4}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="appearance-none rounded-lg tracking-[1em] text-center relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-600 focus:border-green-600 focus:z-10 text-xl font-bold"
                  placeholder="----"
                />
                <p className="text-xs text-gray-500 text-center mt-2">لقد أرسلنا رمزاً مكوناً من 4 أرقام إلى بريدك المذكور.</p>
                
                <div className="mt-4 text-center">
                   {timeLeft > 0 ? (
                       <p className="text-sm font-bold text-red-600">ينتهي الرمز خلال {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)} دقيقة</p>
                   ) : (
                       <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-red-600 font-bold">انتهت صلاحية الرمز، يرجى طلب رمز جديد</p>
                          <button type="button" onClick={handleRequestOTP} className="text-xs bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 flex items-center justify-center gap-2 font-bold rounded-lg transition-colors border border-gray-300">🔄 إعادة إرسال الرمز</button>
                       </div>
                   )}
                </div>

                {devOtp && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-center">
                    <p className="text-xs text-yellow-700 font-medium mb-1">🔧 وضع التطوير — رمز OTP:</p>
                    <p className="text-2xl font-bold tracking-[0.5em] text-yellow-800">{devOtp}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || otpCode.length < 4 || timeLeft === 0}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:bg-green-300 transition-colors"
              >
                {isLoading ? "جاري التحقق..." : "تأكيد الدخول"}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                تعديل البريد الإلكتروني المحقق؟
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
