import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: true,
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  useEffect(() => {
    const rememberedUser = localStorage.getItem("rememberUser");
    if (rememberedUser) {
      setFormData((prev) => ({ ...prev, username: rememberedUser }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const username = formData.username.trim();
    const password = formData.password.trim();

    if (!username || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      setIsLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const API_URL = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: data.user.id,
            username: data.user.username,
            role: data.user.role,
            branches: data.user.branches || [],
          }),
        );

        if (formData.remember) {
          localStorage.setItem("rememberUser", username);
        } else {
          localStorage.removeItem("rememberUser");
        }

        if (data.user.role === "admin") {
          navigate("/admin-form", { replace: true });
        } else {
          navigate("/visit-form", { replace: true });
        }
      } else {
        setError(data.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("การเชื่อมต่อล้มเหลว กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="login-wrapper">
        <div className="bg-canvas">
          <div className="orb orb-primary" />
          <div className="orb orb-secondary" />
          <div className="grid-overlay" />
        </div>

        <div className="main-layout">
          <div className="experience-side">
            <div className="brand-logo-area">
              <div className="logo-box">
                <div className="logo-inner" />
              </div>
              <span className="brand-text">CORE SYSTEMS</span>
            </div>

            <div className="hero-text">
              <div className="status-badge">
                <span className="dot" /> System v4.2.0 Online
              </div>
              <h1>
                บริหารจัดการ
                <br />
                <span className="gradient-text">ข้อมูลสาขา</span> อย่างมืออาชีพ
              </h1>
              <p>
                ระบบวิเคราะห์ข้อมูลหน้างานและตรวจสอบมาตรฐานร้านค้าแบบครบวงจร
                ออกแบบมาเพื่อการทำงานที่รวดเร็วและแม่นยำที่สุด
              </p>
            </div>

            <div className="dashboard-visual">
              <div className="glass-card main-stats">
                <div className="card-head">
                  <div className="card-label">Overall Performance</div>
                  <div className="card-tag">+12.5%</div>
                </div>
                <div className="line-chart-svg">
                  <svg viewBox="0 0 200 60" className="chart-line">
                    <path
                      d="M0,50 Q25,45 50,30 T100,25 T150,15 T200,5"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                    />
                    <defs>
                      <linearGradient
                        id="lineGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="stats-grid">
                  <div className="s-box">
                    <div className="s-label">Active Branches</div>
                    <div className="s-val">42</div>
                  </div>
                  <div className="s-box">
                    <div className="s-label">Daily Reports</div>
                    <div className="s-val">158</div>
                  </div>
                </div>
              </div>

              <div className="glass-card floating-widget w1">
                <div className="w-icon">📊</div>
                <div>
                  <div className="w-title">Live Updates</div>
                  <div className="w-bar">
                    <div className="w-progress" />
                  </div>
                </div>
              </div>

              <div className="glass-card floating-widget w2">
                <div className="user-stack">
                  <div className="u-circle" style={{ background: "#60a5fa" }}>
                    A
                  </div>
                  <div
                    className="u-circle"
                    style={{ background: "#8b5cf6", marginLeft: "-10px" }}
                  >
                    B
                  </div>
                  <div
                    className="u-circle"
                    style={{ background: "#10b981", marginLeft: "-10px" }}
                  >
                    +5
                  </div>
                </div>
                <div className="w-title">Active Teams</div>
              </div>
            </div>
          </div>

          <div className="form-side">
            <div className="login-panel">
              <div className="panel-header">
                <h2>เข้าสู่ระบบ</h2>
                <p>โปรดระบุข้อมูลประจำตัวเพื่อเข้าถึงฟอร์มกรอกข้อมูล</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {error && (
                  <div className="error-alert">
                    <div className="error-icon">!</div>
                    <span>{error}</span>
                  </div>
                )}

                <div className="field-group">
                  <label>Username</label>
                  <div className="input-box">
                    <div className="icon">👤</div>
                    <input
                      type="text"
                      name="username"
                      placeholder="กรอกชื่อผู้ใช้ของคุณ"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Password</label>
                  <div className="input-box">
                    <div className="icon">🔒</div>
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-extra">
                  <label className="checkbox-ui">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleChange}
                    />
                    <span className="check-box" />
                    <span>จดจำการใช้งาน</span>
                  </label>
                  <button type="button" className="text-btn">
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                <button
                  type="submit"
                  className={`primary-btn ${isLoading ? "loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="btn-arrow">→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="footer-copyright">
                <div className="divider-text">Internal Access Only</div>
                <p>© 2024 Core Solutions Enterprise. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&display=swap');

        :root {
          --primary: #2563eb;
          --secondary: #8b5cf6;
          --text-h: #0f172a;
          --text-p: #64748b;
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.4);
        }

        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }

        .login-wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-canvas {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.4;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.6;
          animation: floatOrb 20s infinite alternate;
        }
        .orb-primary { width: 500px; height: 500px; background: #bfdbfe; top: -10%; left: -5%; }
        .orb-secondary { width: 400px; height: 400px; background: #ddd6fe; bottom: -10%; right: 0; animation-delay: -5s; }

        @keyframes floatOrb {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(50px, 100px) scale(1.2); }
        }

        .main-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1300px;
          min-height: 780px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          padding: 20px;
          gap: 40px;
        }

        .experience-side {
          display: flex;
          flex-direction: column;
          padding: 40px;
        }
        .brand-logo-area {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 60px;
        }
        .logo-box {
          width: 40px;
          height: 40px;
          background: var(--text-h);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-10deg);
        }
        .logo-inner { width: 18px; height: 18px; background: white; border-radius: 4px; }
        .brand-text { font-weight: 800; font-size: 22px; letter-spacing: 1px; color: var(--text-h); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }
        .status-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }

        .hero-text h1 {
          font-size: 56px;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 24px;
          color: var(--text-h);
        }
        .gradient-text {
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-text p {
          font-size: 18px;
          line-height: 1.6;
          color: var(--text-p);
          max-width: 460px;
        }

        .dashboard-visual {
          position: relative;
          margin-top: 60px;
          flex-grow: 1;
        }
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.1);
        }
        .main-stats { width: 340px; position: relative; z-index: 5; }
        .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-label { font-size: 14px; font-weight: 700; color: var(--text-p); }
        .card-tag { background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; }

        .line-chart-svg { height: 80px; width: 100%; margin: 10px 0; }
        .chart-line { width: 100%; overflow: visible; }
        .chart-line path { stroke-dasharray: 250; stroke-dashoffset: 250; animation: drawLine 2s ease-out forwards; }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .s-label { font-size: 11px; color: var(--text-p); font-weight: 600; text-transform: uppercase; }
        .s-val { font-size: 24px; font-weight: 800; color: var(--text-h); }

        .floating-widget { position: absolute; display: flex; align-items: center; gap: 12px; padding: 16px 20px; z-index: 6; min-width: 220px; }
        .w1 { top: 10px; right: 100px; animation: floatY 5s infinite alternate ease-in-out; }
        .w2 { bottom: 40px; left: 180px; animation: floatY 6s infinite alternate-reverse ease-in-out; }

        .w-icon { font-size: 24px; }
        .w-title { font-size: 14px; font-weight: 700; color: var(--text-h); }
        .w-bar { height: 6px; width: 100px; background: #e2e8f0; border-radius: 3px; margin-top: 6px; overflow: hidden; }
        .w-progress { height: 100%; width: 70%; background: var(--primary); border-radius: 3px; }

        .user-stack { display: flex; margin-right: 5px; }
        .u-circle { width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }

        @keyframes floatY {
          from { transform: translateY(0px); }
          to { transform: translateY(-20px); }
        }

        .form-side {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .login-panel {
          background: white;
          width: 100%;
          max-width: 480px;
          border-radius: 40px;
          padding: 60px;
          box-shadow: 0 40px 100px -30px rgba(0,0,0,0.1);
        }
        .panel-header h2 { font-size: 40px; font-weight: 800; margin: 0; color: var(--text-h); }
        .panel-header p { color: var(--text-p); margin: 10px 0 40px; font-size: 16px; }

        .auth-form { display: flex; flex-direction: column; gap: 24px; }
        .field-group label { display: block; font-size: 14px; font-weight: 700; color: var(--text-h); margin-bottom: 10px; }
        .input-box {
          position: relative;
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border: 1.5px solid transparent;
          border-radius: 18px;
          height: 60px;
          padding: 0 20px;
          transition: all 0.3s;
        }
        .input-box .icon { font-size: 20px; margin-right: 15px; opacity: 0.6; }
        .input-box input {
          background: transparent;
          border: none;
          width: 100%;
          height: 100%;
          font-size: 16px;
          color: var(--text-h);
          outline: none;
        }
        .input-box:focus-within {
          background: white;
          border-color: var(--primary);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.1);
        }

        .form-extra { display: flex; justify-content: space-between; align-items: center; }
        .checkbox-ui { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: var(--text-p); font-weight: 600; }
        .checkbox-ui input { display: none; }
        .check-box { width: 22px; height: 22px; background: #e2e8f0; border-radius: 7px; position: relative; }
        .checkbox-ui input:checked + .check-box { background: var(--primary); }
        .checkbox-ui input:checked + .check-box:after {
          content: "✓"; position: absolute; color: white; font-size: 12px; font-weight: 900; left: 6px; top: 2px;
        }

        .text-btn { background: none; border: none; color: var(--primary); font-weight: 700; font-size: 14px; cursor: pointer; }

        .primary-btn {
          height: 64px;
          background: var(--text-h);
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .primary-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 15px 40px rgba(0,0,0,0.15); }
        .btn-arrow { transition: transform 0.3s; }
        .primary-btn:hover .btn-arrow { transform: translateX(8px); }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-alert {
          background: #fff1f2;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #be123c;
          font-weight: 600;
          font-size: 14px;
        }
        .error-icon { width: 24px; height: 24px; background: #fb7185; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; }

        .footer-copyright { margin-top: 40px; text-align: center; }
        .divider-text { position: relative; font-size: 12px; color: #cbd5e1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        .divider-text:before, .divider-text:after { content: ""; position: absolute; top: 50%; width: 25%; height: 1px; background: #e2e8f0; }
        .divider-text:before { left: 0; }
        .divider-text:after { right: 0; }
        .footer-copyright p { font-size: 13px; color: #94a3b8; margin: 0; }

        @media (max-width: 1024px) {
          .main-layout { grid-template-columns: 1fr; max-width: 600px; padding: 40px 20px; }
          .experience-side { display: none; }
          .form-side { justify-content: center; }
          .login-panel { padding: 40px; }
        }
      `}</style>
    </>
  );
}