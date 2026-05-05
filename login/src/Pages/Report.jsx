import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://retailer-log-api.onrender.com";

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

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const findBranchMeta = (row, options) => {
    const safeOptions = Array.isArray(options) ? options : [];
    const workplace = normalizeText(
      row?.branch_display_name ||
        row?.display_name ||
        row?.branch_name ||
        row?.workplace
    );
    const displayName = normalizeText(row?.display_name || row?.branch_display_name);
    const branchName = normalizeText(row?.branch_name);

    return (
      safeOptions.find((item) => normalizeText(item.display_name) === workplace) ||
      safeOptions.find((item) => normalizeText(item.branch_name) === workplace) ||
      safeOptions.find((item) => normalizeText(item.store_name) === workplace) ||
      safeOptions.find((item) => normalizeText(item.display_name) === displayName) ||
      safeOptions.find((item) => normalizeText(item.branch_name) === branchName) ||
      null
    );
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resLog, resUsers] = await Promise.all([
        fetch(`${API_URL}/api/work_log`),
        fetch(`${API_URL}/api/users`),
      ]);

      const logsData = resLog.ok ? await resLog.json() : [];
      const usersData = resUsers.ok ? await resUsers.json() : [];

      setRows(Array.isArray(logsData) ? logsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (e) {
      console.error("Fetch error:", e);
      setRows([]);
      setUsers([]);
    }
  };
const userObj = users.find((u) => u.username === selUser);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user-filter-options/${userObj?.username}`);

      if (!res.ok) {
        setMasterOptions([]);
        return;
      }

     const data = await res.json();
setMasterOptions(Array.isArray(data?.options) ? data.options : []);

    } catch (err) {
      setMasterOptions([]);
    }
  };

  if (userObj?.username) {
    fetchData();
  }
}, [userObj]);
  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบรายงานนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(`${API_URL}/api/work_log/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRows((prev) => prev.filter((row) => row.id !== id));
        alert("ลบข้อมูลสำเร็จ");
      } else {
        alert("ลบข้อมูลไม่สำเร็จ");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const userOptions = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    return [...new Set(safeUsers.map((u) => u.username).filter(Boolean))].sort();
  }, [users]);

  const retailerOpts = useMemo(() => {
    const data = selUser ? masterOptions : rows;
    const safe = Array.isArray(data) ? data : [];
    const unique = [
      ...new Set(
        safe
          .map((d) => d.retailer)
          .filter(Boolean)
      ),
    ];
    return unique.sort();
  }, [rows, selUser, masterOptions]);

  const brandOpts = useMemo(() => {
    let data = selUser && masterOptions.length > 0 ? masterOptions : rows;
    let safe = Array.isArray(data) ? data : [];

    if (selRetailer) {
      safe = safe.filter((d) => d.retailer === selRetailer);
    }

    const unique = [...new Set(safe.map((d) => d.brand).filter(Boolean))];
    return unique.sort();
  }, [rows, selUser, selRetailer, masterOptions]);

  const branchList = useMemo(() => {
  let data = selUser ? masterOptions : rows;
  let safe = Array.isArray(data) ? data : [];

  if (selRetailer) {
    safe = safe.filter((d) => d.retailer === selRetailer);
  }

  if (selBrand) {
    safe = safe.filter((d) => d.brand === selBrand);
  }

  const unique = [
    ...new Set(
      safe
        .map(
          (d) =>
            d.branch_display_name ||
            d.display_name ||
            d.branch_name ||
            d.workplace
        )
        .filter(Boolean)
    ),
  ];

  return unique.sort();
}, [rows, selUser, selRetailer, selBrand, masterOptions]);

  const filteredData = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeOptions = Array.isArray(masterOptions) ? masterOptions : [];

    return safeRows.filter((r) => {
      const meta = findBranchMeta(r, safeOptions);

      const effectiveRetailer = r.retailer || meta?.retailer || "";
      const effectiveBrand = r.brand || meta?.brand || "";
      const effectiveBranch =
        r.branch_display_name ||
        r.display_name ||
        meta?.display_name ||
        r.branch_name ||
        meta?.branch_name ||
        r.workplace ||
        "";

      return (
        (!selUser || r.username === selUser) &&
        (!selRetailer || effectiveRetailer === selRetailer) &&
        (!selBrand || effectiveBrand === selBrand) &&
        (!selBranch || effectiveBranch === selBranch)
      );
    });
  }, [rows, masterOptions, selUser, selRetailer, selBrand, selBranch]);

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
              options={userOptions}
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
                      key={r.id || r.mongo_id}
                      r={r}
                      checked={checkedItems[r.id] || false}
                      onCheck={() =>
                        setCheckedItems((p) => ({ ...p, [r.id]: !p[r.id] }))
                      }
                      onDelete={() => handleDelete(r.id || r.mongo_id)}
                      onZoom={setZoomedImage}
                      masterOptions={masterOptions}
                      findBranchMeta={findBranchMeta}
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

const FilterSelect = ({ label, value, options, onChange }) => {
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="filter-group">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">ทั้งหมด</option>
        {safeOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const DataRow = ({
  r,
  checked,
  onCheck,
  onDelete,
  onZoom,
  masterOptions = [],
  findBranchMeta,
}) => {
  const meta =
    typeof findBranchMeta === "function" ? findBranchMeta(r, masterOptions) : null;

  const displayRetailer = r.retailer || meta?.retailer || "-";
  const displayBrand = r.brand || meta?.brand || "-";
  const displayBranch =
    r.branch_display_name ||
    r.display_name ||
    meta?.display_name ||
    r.branch_name ||
    meta?.branch_name ||
    r.workplace ||
    "-";

  const displayDate = r.visit_date || r.work_date || r.createdAt || r.created_at || "";
  const displayIssue = r.detail || r.issue_text || "-";
  const displayPurpose = r.purpose || r.description || "-";
  const displaySolution = r.solution || r.resolution_text || "-";

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

    return `${API_URL}/uploads/${clean}`;
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
                key={`${r.id || r.mongo_id}-img-${i}`}
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
          {displayDate
            ? new Date(displayDate).toLocaleDateString("th-TH")
            : "-"}
        </span>
        <span className="date-sub">System Log</span>
      </td>
      <td className="td-user">
        <div className="user-avatar">
          {r.username?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span>{r.username || "-"}</span>
      </td>
      <td className="td-location">
        <div className="loc-retailer">{displayRetailer}</div>
        <div className="loc-name">{displayBranch}</div>
        <span className="brand-tag">{displayBrand}</span>
      </td>
      <td className="td-issue">
        <div className="issue-desc">{displayPurpose}</div>
        <div className="issue-detail">{displayIssue}</div>
      </td>
      <td className="td-resolution">{displaySolution}</td>
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
    <div className="zoom-content" onClick={(e) => e.stopPropagation()}>
      <img src={src} alt="Zoomed" />
      <button className="close-zoom" onClick={onClose}>
        ✕
      </button>
    </div>
  </div>
);

const customCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800&display=swap');

  :root {
    --p-blue: #2563eb;
    --p-indigo: #4f46e5;
    --t-main: #0f172a;
    --t-sub: #64748b;
    --bg-light: #f8fafc;
    --white: #ffffff;
    --radius-l: 24px;
    --shadow-sm: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 20px 25px -5px rgb(0 0 0 / 0.05);
  }

  .report-container {
    min-height: 100vh;
    background-color: #f1f5f9;
    font-family: 'Kanit', sans-serif;
    position: relative;
    padding: 40px 24px;
    color: var(--t-main);
    overflow-x: hidden;
  }

  .bg-blur {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
    z-index: 0;
  }

  .blur-1 {
    top: -100px;
    left: -100px;
    background: #bfdbfe;
  }

  .blur-2 {
    bottom: -100px;
    right: -100px;
    background: #c7d2fe;
  }

  .main-content {
    position: relative;
    z-index: 2;
    max-width: 1250px;
    margin: 0 auto;
  }

  .header-card,
  .filter-card,
  .table-card {
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(18px);
    border-radius: 28px;
    box-shadow: 0 10px 40px rgba(15, 23, 42, 0.06);
    border: 1px solid rgba(255,255,255,0.7);
  }

  .header-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 28px;
    margin-bottom: 20px;
  }

  .badge-new {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 999px;
    background: #dbeafe;
    color: #2563eb;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 16px;
    text-transform: uppercase;
  }

  .title-text {
    font-size: 42px;
    margin: 0 0 8px;
    font-weight: 800;
    letter-spacing: -1px;
  }

  .subtitle-text {
    margin: 0 0 14px;
    color: #64748b;
    font-size: 18px;
  }

  .admin-status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-weight: 600;
  }

  .pulse-dot {
    width: 9px;
    height: 9px;
    background: #22c55e;
    border-radius: 50%;
    display: inline-block;
  }

  .admin-name {
    color: #2563eb;
    font-weight: 700;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn-outline,
  .btn-solid {
    border: none;
    border-radius: 16px;
    padding: 14px 20px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-outline {
    background: #fff;
    border: 1px solid #dbe3ef;
    color: #0f172a;
  }

  .btn-solid {
    background: #0f172a;
    color: #fff;
  }

  .filter-card {
    padding: 24px 28px;
    margin-bottom: 18px;
  }

  .filter-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .filter-title h3 {
    margin: 0;
    font-size: 18px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .filter-group label {
    display: block;
    margin-bottom: 8px;
    color: #64748b;
    font-weight: 600;
  }

  .filter-group select {
    width: 100%;
    border-radius: 16px;
    border: 1px solid #d9e2ec;
    background: #fff;
    padding: 14px 16px;
    font-family: inherit;
    font-size: 15px;
    outline: none;
  }

  .table-card {
    padding: 24px 28px;
  }

  .table-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .table-info h3 {
    margin: 0 0 10px;
    font-size: 20px;
  }

  .count-pill {
    display: inline-block;
    background: #e0e7ff;
    color: #2563eb;
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
  }

  .table-overflow {
    overflow-x: auto;
  }

  .custom-table {
    width: 100%;
    border-collapse: collapse;
  }

  .custom-table thead th {
    text-align: left;
    padding: 16px 14px;
    background: #f8fafc;
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
  }

  .custom-table tbody td {
    padding: 18px 14px;
    border-top: 1px solid #eef2f7;
    vertical-align: top;
    font-size: 15px;
  }

  .date-main {
    display: block;
    font-weight: 700;
    color: #0f172a;
  }

  .date-sub {
    display: block;
    color: #94a3b8;
    font-size: 13px;
    margin-top: 4px;
  }

  .td-user {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }

  .user-avatar {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: #dbeafe;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .loc-retailer {
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 4px;
  }

  .loc-name {
    font-weight: 700;
    margin-bottom: 6px;
  }

  .brand-tag {
    display: inline-block;
    background: #f1f5f9;
    color: #475569;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .issue-desc {
    color: #0f172a;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .issue-detail {
    color: #64748b;
  }

  .td-resolution {
    color: #334155;
    font-weight: 500;
  }

  .thumb-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .thumb-item {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    overflow: hidden;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    cursor: pointer;
  }

  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-empty {
    color: #94a3b8;
    font-size: 13px;
  }

  .check-work-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .official-checkbox {
    width: 18px;
    height: 18px;
  }

  .checkbox-status-label {
    font-size: 13px;
    color: #334155;
    font-weight: 600;
  }

  .btn-delete {
    background: #fee2e2;
    color: #dc2626;
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .no-data {
    text-align: center;
    padding: 40px 20px !important;
  }

  .empty-state {
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  .empty-icon {
    font-size: 40px;
  }

  .zoom-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .zoom-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }

  .zoom-content img {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 18px;
    display: block;
  }

  .close-zoom {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #fff;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 18px;
  }

  @media (max-width: 1024px) {
    .filter-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .header-card {
      flex-direction: column;
      gap: 20px;
    }
  }

  @media (max-width: 640px) {
    .report-container {
      padding: 20px 14px;
    }

    .filter-grid {
      grid-template-columns: 1fr;
    }

    .title-text {
      font-size: 30px;
    }
  }
`;