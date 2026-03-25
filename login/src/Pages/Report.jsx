import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ==========================================
// 1. MAIN COMPONENT (Logic & State)
// ==========================================
export default function Report() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [selUser, setSelUser] = useState("");
  const [selRetailer, setSelRetailer] = useState("");
  const [selBrand, setSelBrand] = useState("");
  const [selBranch, setSelBranch] = useState("");
  const [masterOptions, setMasterOptions] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resLog, resUsers] = await Promise.all([
        fetch("http://localhost:5000/api/work_log"),
        fetch("http://localhost:5000/api/users"),
      ]);
      setRows(resLog.ok ? await resLog.json() : []);
      setUsers(resUsers.ok ? await resUsers.json() : []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => {
    if (selUser) {
      const userObj = users.find((u) => u.username === selUser);
      if (userObj) {
        fetch(`http://localhost:5000/api/user-filter-options/${userObj.id}`)
          .then((res) => res.json())
          .then((data) => setMasterOptions(data))
          .catch((err) => console.error("Fetch master options error:", err));
      }
    } else {
      setMasterOptions([]);
    }
  }, [selUser, users]);

  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบรายงานนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/work_log/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows(rows.filter((row) => row.id !== id));
        alert("ลบข้อมูลสำเร็จ");
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const retailerOpts = useMemo(() => {
    const data = selUser ? masterOptions : rows;
    const unique = [...new Set(data.map((d) => d.retailer))].filter(Boolean);
    return unique.sort();
  }, [rows, selUser, masterOptions]);

  const brandOpts = useMemo(() => {
    let data = selUser ? masterOptions : rows;
    if (selRetailer) data = data.filter((d) => d.retailer === selRetailer);
    const unique = [...new Set(data.map((d) => d.brand))].filter(Boolean);
    return unique.sort();
  }, [rows, selUser, selRetailer, masterOptions]);

  const branchList = useMemo(() => {
    let data = selUser ? masterOptions : rows;
    if (selRetailer) data = data.filter((d) => d.retailer === selRetailer);
    if (selBrand) data = data.filter((d) => d.brand === selBrand);
    const unique = [
      ...new Set(
        data.map((d) => d.display_name || d.branch_name || d.workplace),
      ),
    ].filter(Boolean);
    return unique.sort();
  }, [rows, selUser, selRetailer, selBrand, masterOptions]);

  const filteredData = useMemo(() => {
    return rows.filter(
      (r) =>
        (!selUser || r.username === selUser) &&
        (!selRetailer || r.retailer === selRetailer) &&
        (!selBrand || r.brand === selBrand) &&
        (!selBranch || r.workplace === selBranch),
    );
  }, [rows, selUser, selRetailer, selBrand, selBranch]);

  return (
    <div className="report-container">
      <div className="bg-blur blur-1"></div>
      <div className="bg-blur blur-2"></div>

      <div className="main-content">
        <header className="header-card">
          <div className="header-info">
            <span className="badge-new">Analytics Dashboard</span>
            <h1 className="title-text">รายงานการเข้าตรวจงาน</h1>
            <p className="subtitle-text">
              วิเคราะห์และติดตามผลการดำเนินงานแบบ Real-time
            </p>
            <div className="admin-status">
              <span className="pulse-dot"></span> Admin Mode:{" "}
              <span className="admin-name">Administrator</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-outline" onClick={() => navigate(-1)}>
              ← ย้อนกลับ
            </button>
            <button
              className="btn-solid"
              onClick={() => window.location.reload()}
            >
              ⟳ รีเฟรชข้อมูล
            </button>
          </div>
        </header>

        <section className="filter-card">
          <div className="filter-title">
            <span>🔍</span>
            <h3>ตัวกรองข้อมูลอัจฉริยะ</h3>
          </div>
          <div className="filter-grid">
            <FilterSelect
              label="ผู้ใช้ระบบ"
              value={selUser}
              options={users.map((u) => u.username)}
              onChange={(v) => {
                setSelUser(v);
                setSelRetailer("");
                setSelBrand("");
                setSelBranch("");
              }}
            />

            <FilterSelect
              label="กลุ่มห้างฯ"
              value={selRetailer}
              options={retailerOpts}
              onChange={(v) => {
                setSelRetailer(v);
                setSelBrand("");
                setSelBranch("");
              }}
            />

            <FilterSelect
              label="แบรนด์สินค้า"
              value={selBrand}
              options={brandOpts}
              onChange={(v) => {
                setSelBrand(v);
                setSelBranch("");
              }}
            />

            <FilterSelect
              label="สาขาที่เข้าตรวจ"
              value={selBranch}
              options={branchList}
              onChange={setSelBranch}
            />
          </div>
        </section>

        <div className="table-card">
          <div className="table-top">
            <div className="table-info">
              <h3>รายการผลลัพธ์</h3>
              <span className="count-pill">{filteredData.length} รายการ</span>
            </div>
          </div>
          <div className="table-overflow">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>วัน-เวลา</th>
                  <th>ผู้ปฏิบัติงาน</th>
                  <th>รายละเอียดสถานที่</th>
                  <th>ปัญหาที่พบ</th>
                  <th>การแก้ไข</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <EmptyState />
                ) : (
                  filteredData.map((r) => (
                    <DataRow
                      key={r.id}
                      r={r}
                      checked={checkedItems[r.id] || false}
                      onCheck={() =>
                        setCheckedItems((p) => ({ ...p, [r.id]: !p[r.id] }))
                      }
                      onDelete={() => handleDelete(r.id)}
                      onZoom={setZoomedImage}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {zoomedImage && (
        <ImageZoom src={zoomedImage} onClose={() => setZoomedImage(null)} />
      )}
      <style>{customCSS}</style>
    </div>
  );
}

const FilterSelect = ({ label, value, options, onChange }) => (
  <div className="filter-group">
    <label>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">ทั้งหมด</option>
      {options.map((opt, i) => (
        <option key={i} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const DataRow = ({ r, checked, onCheck, onDelete, onZoom }) => {
  const normalizeImageSrc = (src) => {
    if (!src) return "";
    const clean = String(src).trim();

    if (
      clean.startsWith("data:image/") ||
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      return clean;
    }

    return `http://localhost:5000/uploads/${clean}`;
  };

  const renderImgs = (data) => {
    try {
      if (!data) return <div className="thumb-empty">ไม่มีรูป</div>;

      let imgs = [];

      if (typeof data === "string") {
        const trimmed = data.trim();
        if (trimmed.startsWith("[")) {
          imgs = JSON.parse(trimmed);
        } else {
          imgs = [trimmed];
        }
      } else if (Array.isArray(data)) {
        imgs = data;
      }

      if (!Array.isArray(imgs) || imgs.length === 0) {
        return <div className="thumb-empty">ไม่มีรูป</div>;
      }

      return (
        <div className="thumb-grid">
          {imgs.map((src, i) => {
            const finalSrc = normalizeImageSrc(src);
            return (
              <div
                key={i}
                className="thumb-item"
                onClick={() => onZoom(finalSrc)}
              >
                <img src={finalSrc} className="thumb-img" alt="preview" />
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <div className="thumb-empty">ไม่มีรูป</div>;
    }
  };

  return (
    <tr>
      <td className="td-date">
        <span className="date-main">
          {new Date(r.work_date || r.created_at).toLocaleDateString("th-TH")}
        </span>
        <span className="date-sub">System Log</span>
      </td>
      <td className="td-user">
        <div className="user-avatar">{r.username?.charAt(0).toUpperCase()}</div>
        <span>{r.username}</span>
      </td>
      <td className="td-location">
        <div className="loc-retailer">{r.retailer}</div>
        <div className="loc-name">{r.workplace}</div>
        <span className="brand-tag">{r.brand}</span>
      </td>
      <td className="td-issue">
        <div className="issue-desc">{r.description}</div>
        <div className="issue-detail">{r.issue_text}</div>
      </td>
      <td className="td-resolution">{r.resolution_text || "-"}</td>
      <td>{renderImgs(r.before_images)}</td>
      <td>{renderImgs(r.after_images)}</td>
      <td>
        <div className="check-work-wrap">
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            className="official-checkbox"
          />
          <label className="checkbox-status-label">
            {checked ? "ตรวจแล้ว" : "รอดำเนินการ"}
          </label>
        </div>
      </td>
      <td>
        <button className="btn-delete" onClick={onDelete}>
          ลบ
        </button>
      </td>
    </tr>
  );
};

const EmptyState = () => (
  <tr>
    <td colSpan="9" className="no-data">
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <p>ไม่พบข้อมูลที่กำลังค้นหา</p>
      </div>
    </td>
  </tr>
);

const ImageZoom = ({ src, onClose }) => (
  <div className="zoom-overlay" onClick={onClose}>
    <div className="zoom-content">
      <img src={src} alt="Zoomed" />
      <button className="close-zoom" onClick={onClose}>
        ✕
      </button>
    </div>
  </div>
);

const customCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800&display=swap');
  :root { --p-blue: #2563eb; --p-indigo: #4f46e5; --t-main: #0f172a; --t-sub: #64748b; --bg-light: #f8fafc; --white: #ffffff; --radius-l: 24px; --shadow-sm: 0 4px 6px -1px rgb(0 0 0 / 0.1); --shadow-md: 0 20px 25px -5px rgb(0 0 0 / 0.05); }
  .report-container { min-height: 100vh; background-color: #f1f5f9; font-family: 'Kanit', sans-serif; position: relative; padding: 40px 24px; color: var(--t-main); overflow-x: hidden; }
  .bg-blur { position: absolute; width: 500px; height: 500px; border-radius: 50%; filter: blur(100px); opacity: 0.3; z-index: 0; }
  .blur-1 { top: -100px; left: -100px; background: #bfdbfe; }
  .blur-2 { bottom: -100px; right: -100px; background: #ddd6fe; }
  .main-content { position: relative; z-index: 10; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
  .header-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); padding: 32px; border-radius: var(--radius-l); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; gap: 20px; }
  .badge-new { background: #dbeafe; color: var(--p-blue); padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; text-transform: uppercase; }
  .title-text { font-size: 34px; font-weight: 800; margin: 12px 0 4px; letter-spacing: -1px; }
  .subtitle-text { color: var(--t-sub); font-size: 16px; margin: 0; }
  .admin-status { display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 14px; font-weight: 600; color: var(--t-sub); }
  .pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 rgba(16, 185, 129, 0.4); animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
  .admin-name { color: var(--p-blue); }
  .header-actions { display: flex; gap: 12px; }
  .btn-solid { background: var(--t-main); color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
  .btn-solid:hover { background: #1e293b; transform: translateY(-2px); }
  .btn-outline { background: white; color: var(--t-main); border: 1.5px solid #e2e8f0; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.3s; }
  .btn-outline:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .filter-card { background: white; padding: 24px 32px; border-radius: var(--radius-l); box-shadow: var(--shadow-sm); }
  .filter-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .filter-title h3 { margin: 0; font-size: 18px; font-weight: 800; }
  .filter-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .filter-group label { display: block; font-size: 13px; font-weight: 700; color: var(--t-sub); margin-bottom: 8px; text-transform: uppercase; }
  .filter-group select { width: 100%; height: 48px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 0 16px; font-family: inherit; font-weight: 500; color: var(--t-main); outline: none; transition: 0.3s; cursor: pointer; }
  .filter-group select:focus { border-color: var(--p-blue); background: white; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
  .table-card { background: white; border-radius: var(--radius-l); box-shadow: var(--shadow-sm); padding: 10px; }
  .table-top { padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; }
  .table-info h3 { margin: 0; font-size: 20px; font-weight: 800; }
  .count-pill { background: #eff6ff; color: var(--p-blue); padding: 4px 12px; border-radius: 100px; font-size: 14px; font-weight: 700; margin-top: 4px; display: inline-block; }
  .table-overflow { overflow-x: auto; border-radius: 16px; }
  .custom-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
  .custom-table th { background: #f8fafc; padding: 18px 20px; text-align: left; font-size: 13px; font-weight: 800; color: var(--t-sub); text-transform: uppercase; border-bottom: 2px solid #f1f5f9; }
  .custom-table td { padding: 20px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .td-date { width: 120px; }
  .td-date .date-main { display: block; font-weight: 700; color: var(--t-main); font-size: 15px; }
  .td-date .date-sub { font-size: 12px; color: var(--t-sub); font-weight: 500; }
  .td-user { display: flex; align-items: center; gap: 10px; font-weight: 700; }
  .user-avatar { width: 32px; height: 32px; background: #e0e7ff; color: #4338ca; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .loc-retailer { font-weight: 800; font-size: 15px; color: var(--p-blue); margin-bottom: 4px; }
  .loc-name { font-weight: 600; color: var(--t-main); font-size: 14px; margin-bottom: 6px; }
  .brand-tag { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #475569; }
  .issue-desc { font-weight: 700; color: #e11d48; margin-bottom: 4px; font-size: 14px; }
  .issue-detail { font-size: 13px; color: var(--t-sub); line-height: 1.6; max-width: 300px; }
  .thumb-grid { display: flex; gap: 6px; flex-wrap: wrap; }
  .thumb-item { width: 64px; height: 64px; border-radius: 12px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; transition: 0.3s; cursor: pointer; }
  .thumb-item:hover { transform: scale(1.05); border-color: var(--p-blue); }
  .thumb-img { width: 100%; height: 100%; object-fit: cover; }
  .thumb-empty { width: 64px; height: 64px; background: #f1f5f9; color: #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; border-radius: 12px; }
  .check-work-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .official-checkbox { width: 22px; height: 22px; cursor: pointer; accent-color: #10b981; }
  .checkbox-status-label { font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-delete { display: flex; align-items: center; justify-content: center; height: 38px; padding: 0 16px; border-radius: 10px; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .btn-delete:hover { background: #dc2626; color: white; border-color: #dc2626; transform: translateY(-1px); }
  .zoom-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
  .zoom-content { position: relative; max-width: 90%; max-height: 90%; }
  .zoom-content img { max-width: 100%; max-height: 90vh; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  .close-zoom { position: absolute; top: -40px; right: 0; background: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer; }
  .no-data { padding: 100px !important; text-align: center; }
  .empty-state { color: #cbd5e1; }
  .empty-icon { font-size: 50px; display: block; margin-bottom: 10px; }
  .empty-state p { font-size: 16px; font-weight: 600; color: #94a3b8; }
`;