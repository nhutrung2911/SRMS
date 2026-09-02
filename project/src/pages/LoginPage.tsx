import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, Sparkles, Shield, ArrowRight } from 'lucide-react';

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('admin@srms.com');
  const [password, setPassword] = useState('password');

  const inputClass = "w-full h-10 px-3.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold font-display tracking-tight">SRMS</div>
              <div className="text-xs text-brand-200">Smart Revenue Management</div>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl xl:text-4xl font-bold font-display tracking-tight mb-4 leading-tight">
              Make better revenue decisions with AI-powered insights.
            </h1>
            <p className="text-brand-100 text-base leading-relaxed mb-8">
              Monitor, analyze, and optimize your business performance across revenue, inventory, pricing, and customers — all in one platform.
            </p>
            <div className="space-y-4">
              {[
                { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track revenue, profit, and KPIs as they happen' },
                { icon: Sparkles, title: 'AI Recommendations', desc: 'Get actionable suggestions backed by your data' },
                { icon: Shield, title: 'Enterprise Security', desc: 'Row-level security and role-based access control' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{f.title}</div>
                    <div className="text-sm text-brand-200">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-brand-200">
            © 2024 SRMS. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-canvas">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-ink-900 font-display">SRMS</div>
              <div className="text-[10px] text-ink-400">Smart Revenue Management</div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-ink-900 mb-1">Welcome back</h2>
          <p className="text-sm text-ink-500 mb-6">Sign in to your SRMS account</p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              // Sử dụng proxy Vite, chỉ cần gọi /api/login
              let res;
              try {
                res = await fetch('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  body: JSON.stringify({ email, password })
                });
              } catch (networkErr) {
                alert('Không thể kết nối máy chủ, vui lòng thử lại.');
                return;
              }
              
              if (res.status === 401) {
                alert('Sai tài khoản hoặc mật khẩu.');
                return;
              } else if (!res.ok) {
                alert('Đã xảy ra lỗi hệ thống, vui lòng thử lại.');
                return;
              }
              
              const data = await res.json();
              localStorage.setItem('token', data.token);
              localStorage.setItem('user', JSON.stringify(data.user));
              onSuccess();
            } catch (err) {
              console.error(err);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                Remember me
              </label>
              <button type="button" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Forgot password?</button>
            </div>
            <Button variant="primary" size="lg" className="w-full" icon={<ArrowRight className="w-4 h-4" />} type="submit">
              Sign In
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-200 text-center">
            <p className="text-xs text-ink-400">Don't have an account? <button className="text-brand-600 font-medium hover:text-brand-700">Contact sales</button></p>
          </div>
        </div>
      </div>
    </div>
  );
}
