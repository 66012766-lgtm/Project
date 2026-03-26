import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ==========================================
// 1. MAIN COMPONENT (Logic Only)
// ==========================================
export default function AdminForm() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
  });
  const [selectedBranchId, setSelectedBranchId] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState({
    id: "",
    username: "",
    password: "",
    role: "",
  });

  const getBranchLabel = (branch) =>
    branch?.display_name || branch?.branch_name || branch?.name || "";

  const uniqueNumbers = (arr) =>
    [...new Set((arr || []).map((n) => Number(n)).filter((n) => !Number.isNaN(n)))];

  const fetchData = async () => {
    try {
      const [resUsers, resBranches] = await Promise.all([
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/branches`),
      ]);

      const usersData = resUsers.ok ? await resUsers.json() : [];
      const branchesData = resBranches.ok ? await resBranches.json() : [];

      const safeBranches = Array.isArray(branchesData) ? branchesData : [];
      const safeUsers = Array.isArray(usersData) ? usersData : [];

      const usersWithBranches = await Promise.all(
        safeUsers.map(async (u) => {
          try {
            // ✅ admin ไม่มีสาขา
            if (String(u.role).toLowerCase() === "admin") {
              return { ...u, branches: [] };
            }

            const resUb = await fetch(`${API_URL}/api/user-branches/${u.id}`);
            const ubData = resUb.ok ? await resUb.json() : [];

            const branchIds = Array.isArray(ubData)
              ? uniqueNumbers(
                  ubData.map((item) => Number(item?.id ?? item?.branch_id))
                )
              : [];

            return {
              ...u,
              branches: branchIds,
            };
          } catch (e) {
            return { ...u, branches: [] };
          }
        })
      );

      setUsers(usersWithBranches);
      setBranches(safeBranches);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};
    if (!currentUser.username || currentUser.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
    fetchData();
  }, [navigate]);

  const addUser = async () => {
    if (!newUser.username || !newUser.password) {
      return alert("กรุณากรอกชื่อและรหัสผ่าน");
    }

    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setNewUser({ username: "", password: "", role: "user" });
        fetchData();
        setSuccessMessage("✨ เพิ่มพนักงานเรียบร้อย");
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        alert("ไม่สามารถเพิ่มพนักงานได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  const handleUpdateUser = async () => {
    if (!editUserData.username) return alert("ชื่อผู้ใช้งานห้ามว่าง");

    try {
      const res = await fetch(`${API_URL}/api/users/${editUserData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserData),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchData();
        setSuccessMessage("✅ อัปเดตข้อมูลสำเร็จ");
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        alert("ไม่สามารถอัปเดตข้อมูลได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  const handleAddOrToggleBranch = async (userId, inputValue, userRole) => {
    if (!inputValue) return;

    if (String(userRole).toLowerCase() === "admin") {
      alert("ผู้ดูแลระบบไม่สามารถมีสาขาได้");
      return;
    }

    let targetBranch = branches.find(
      (b) => getBranchLabel(b).trim() === inputValue.trim()
    );

    if (!targetBranch) {
      if (window.confirm(`ไม่พบสาขา "${inputValue}" ต้องการสร้างใหม่หรือไม่?`)) {
        const res = await fetch(`${API_URL}/api/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: inputValue.trim(),
            name: inputValue.trim(),
          }),
        });

        targetBranch = await res.json();
        await fetchData();
      } else {
        return;
      }
    }

    if (!targetBranch?.id && !targetBranch?.branchId) {
      alert("ไม่พบรหัสสาขา");
      return;
    }

    await toggleUserBranch(userId, targetBranch.id || targetBranch.branchId);
  };

  const toggleUserBranch = async (userId, branchId) => {
    await fetch(`${API_URL}/api/user-branches/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, branchId: Number(branchId) }),
    });

    setSelectedBranchId((prev) => ({ ...prev, [userId]: "" }));
    fetchData();
    setSuccessMessage("📌 อัปเดตสาขาเรียบร้อย");
    setTimeout(() => setSuccessMessage(""), 2000);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("ต้องการลบพนักงานใช่หรือไม่?")) return;

    await fetch(`${API_URL}/api/users/${id}`, {
      method: "DELETE",
    });

    fetchData();
  };

  // ==========================================
  // 2. RENDER (HTML Structure)
  // ==========================================
  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>H</div>
          <span style={styles.logoText}>
            HR <br />
            <small style={styles.logoSub}>ADMIN PANEL</small>
          </span>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navItemActive}>👥 จัดการพนักงาน</div>
          <div style={styles.navItem} onClick={() => navigate("/report")}>
            📊 รายงานสรุป
          </div>
          <div style={styles.divider}></div>
          <div
            style={styles.navItemLogout}
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
          >
            🚪 ออกจากระบบ
          </div>
        </nav>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.topHeader}>
          <section>
            <h2 style={styles.pageTitle}>User Management</h2>
            <p style={styles.subTitle}>
              จัดการรายชื่อพนักงานและสิทธิ์การเข้าถึงสาขา
            </p>
          </section>
          {successMessage && <div style={styles.toast}>{successMessage}</div>}
        </header>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>➕ เพิ่มพนักงานใหม่</h3>
          <div style={styles.registrationGrid}>
            <div style={styles.inputField}>
              <label style={styles.label}>ชื่อผู้ใช้งาน</label>
              <input
                style={styles.input}
                placeholder="เช่น somchai_k"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
              />
            </div>
            <div style={styles.inputField}>
              <label style={styles.label}>รหัสผ่าน</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
            </div>
            <div style={styles.inputField}>
              <label style={styles.label}>สิทธิ์การใช้งาน</label>
              <select
                style={styles.input}
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
              >
                <option value="user">Staff (พนักงาน)</option>
                <option value="admin">Administrator (ผู้ดูแล)</option>
              </select>
            </div>
            <button style={styles.btnCreate} onClick={addUser}>
              บันทึกข้อมูล
            </button>
          </div>
        </section>

        <section style={styles.tableCard}>
          <div style={styles.tableHeaderSection}>
            <h3 style={styles.cardTitle}>📋 รายชื่อพนักงานในระบบ</h3>
          </div>

          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.thMain}>ข้อมูลพนักงาน</th>
                  <th style={styles.th}>สถานะ</th>
                  <th style={styles.th}>เพิ่มสาขา</th>
                  <th style={styles.thAction}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    setSelectedBranchId={setSelectedBranchId}
                    handleAddOrToggleBranch={handleAddOrToggleBranch}
                    toggleUserBranch={toggleUserBranch}
                    setEditUserData={setEditUserData}
                    setShowEditModal={setShowEditModal}
                    deleteUser={deleteUser}
                    getBranchLabel={getBranchLabel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showEditModal && (
          <EditModal
            editUserData={editUserData}
            setEditUserData={setEditUserData}
            handleUpdateUser={handleUpdateUser}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================

const UserRow = ({
  u,
  branches,
  selectedBranchId,
  setSelectedBranchId,
  handleAddOrToggleBranch,
  toggleUserBranch,
  setEditUserData,
  setShowEditModal,
  deleteUser,
  getBranchLabel,
}) => {
  const assignedBranches =
    u.role === "admin"
      ? []
      : branches.filter((b) => (u.branches || []).includes(Number(b.id)));

  return (
    <>
      <tr style={styles.tableRow}>
        <td style={styles.tdMain}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {(u.username || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.uName}>{u.username}</div>
              <div style={styles.uPass}>
                ID: #{u.id} • PW: {u.password}
              </div>
            </div>
          </div>
        </td>
        <td style={styles.td}>
          <span style={u.role === "admin" ? styles.badgeAdmin : styles.badgeUser}>
            {u.role === "admin" ? "Admin" : "Staff"}
          </span>
        </td>
        <td style={styles.td}>
          {u.role === "user" ? (
            <div style={styles.inlineAddBranch}>
              <input
                list={`branch-list-${u.id}`}
                style={styles.tableInputSearch}
                placeholder="ค้นหาสาขา..."
                value={selectedBranchId[u.id] || ""}
                onChange={(e) =>
                  setSelectedBranchId({
                    ...selectedBranchId,
                    [u.id]: e.target.value,
                  })
                }
              />
              <datalist id={`branch-list-${u.id}`}>
                {branches.map((b) => (
                  <option key={b.id} value={getBranchLabel(b)} />
                ))}
              </datalist>
              <button
                style={styles.btnTableSave}
                onClick={() =>
                  handleAddOrToggleBranch(u.id, selectedBranchId[u.id], u.role)
                }
              >
                เพิ่ม
              </button>
            </div>
          ) : (
            <span style={styles.noBranchText}>ผู้ดูแลระบบไม่มีสาขา</span>
          )}
        </td>
        <td style={styles.tdAction}>
          <div style={styles.actionGroup}>
            <button
              style={styles.btnEdit}
              onClick={() => {
                setEditUserData({
                  id: u.id,
                  username: u.username,
                  password: "",
                  role: u.role,
                });
                setShowEditModal(true);
              }}
            >
              แก้ไข
            </button>
            <button style={styles.btnDelete} onClick={() => deleteUser(u.id)}>
              ลบ
            </button>
          </div>
        </td>
      </tr>
      <tr style={styles.branchRow}>
        <td colSpan="4" style={styles.branchCell}>
          <div style={styles.chipsContainer}>
            {assignedBranches.length > 0 ? (
              assignedBranches.map((b) => (
                <div key={b.id} style={styles.branchChip}>
                  {getBranchLabel(b)}{" "}
                  <span
                    style={styles.chipRemove}
                    onClick={() => toggleUserBranch(u.id, b.id)}
                  >
                    ×
                  </span>
                </div>
              ))
            ) : (
              <span style={styles.noBranchText}>
                {u.role === "admin"
                  ? "ผู้ดูแลระบบไม่มีสาขาที่รับผิดชอบ"
                  : "ยังไม่มีสาขาที่รับผิดชอบ"}
              </span>
            )}
          </div>
        </td>
      </tr>
    </>
  );
};

const EditModal = ({
  editUserData,
  setEditUserData,
  handleUpdateUser,
  onClose,
}) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalContent}>
      <div style={styles.modalHeader}>
        <h3 style={styles.cardTitle}>📝 แก้ไขข้อมูลพนักงาน</h3>
        <span style={styles.modalClose} onClick={onClose}>
          ✕
        </span>
      </div>
      <div style={styles.modalBody}>
        <div style={styles.inputField}>
          <label style={styles.label}>ชื่อผู้ใช้งาน</label>
          <input
            style={styles.input}
            value={editUserData.username}
            onChange={(e) =>
              setEditUserData({ ...editUserData, username: e.target.value })
            }
          />
        </div>
        <div style={styles.inputField}>
          <label style={styles.label}>
            รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)
          </label>
          <input
            style={styles.input}
            type="password"
            value={editUserData.password}
            onChange={(e) =>
              setEditUserData({ ...editUserData, password: e.target.value })
            }
          />
        </div>
        <div style={styles.inputField}>
          <label style={styles.label}>สิทธิ์การใช้งาน</label>
          <select
            style={styles.input}
            value={editUserData.role}
            onChange={(e) =>
              setEditUserData({ ...editUserData, role: e.target.value })
            }
          >
            <option value="user">พนักงานทั่วไป</option>
            <option value="admin">ผู้ดูแลระบบ</option>
          </select>
        </div>
        <div style={styles.modalFooter}>
          <button
            style={{ ...styles.btnCreate, flex: 1 }}
            onClick={handleUpdateUser}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
          <button style={styles.btnCancel} onClick={onClose}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ==========================================
// 4. DESIGN SYSTEM
// ==========================================
const styles = {
  dashboard: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Kanit', sans-serif",
  },
  sidebar: {
    width: "280px",
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: "32px 24px",
    boxShadow: "4px 0 10px rgba(0,0,0,0.05)",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "48px",
  },
  logoIcon: {
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "20px",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "700",
    lineHeight: "1.2",
    letterSpacing: "1px",
  },
  logoSub: { fontSize: "10px", opacity: 0.7 },
  nav: { display: "flex", flexDirection: "column", gap: "10px" },
  navItem: {
    padding: "14px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    color: "#94a3b8",
    transition: "0.3s",
    fontSize: "15px",
  },
  navItemActive: {
    padding: "14px 18px",
    borderRadius: "12px",
    backgroundColor: "#1e293b",
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: "15px",
    borderLeft: "4px solid #3b82f6",
  },
  divider: { height: "1px", backgroundColor: "#334155", margin: "20px 0" },
  navItemLogout: {
    padding: "14px 18px",
    color: "#f87171",
    cursor: "pointer",
    fontSize: "15px",
  },
  mainContent: { flex: 1, padding: "40px", overflowY: "auto" },
  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
  },
  pageTitle: {
    fontSize: "28px",
    color: "#1e293b",
    fontWeight: "700",
    margin: 0,
  },
  subTitle: { color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" },
  toast: {
    background: "#f0fdf4",
    color: "#16a34a",
    padding: "10px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    border: "1px solid #bbf7d0",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
    marginBottom: "32px",
    border: "1px solid #f1f5f9",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: "600",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  registrationGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto",
    gap: "20px",
    alignItems: "flex-end",
  },
  inputField: { display: "flex", flexDirection: "column", gap: "8px" },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#475569",
    marginLeft: "4px",
  },
  input: {
    border: "1.5px solid #e2e8f0",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    outline: "none",
    color: "#1e293b",
  },
  btnCreate: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "12px 28px",
    borderRadius: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
    marginBottom: "32px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  tableHeaderSection: { padding: "24px 24px 0 24px" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeaderRow: { background: "#f8fafc", borderBottom: "1px solid #f1f5f9" },
  th: {
    textAlign: "left",
    padding: "16px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  thMain: {
    textAlign: "left",
    padding: "16px 16px 16px 24px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  thAction: {
    textAlign: "right",
    padding: "16px 24px 16px 16px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableRow: { transition: "0.2s" },
  td: { padding: "20px 16px" },
  tdMain: { padding: "20px 16px 20px 24px" },
  tdAction: { padding: "20px 24px 20px 16px", textAlign: "right" },
  userInfo: { display: "flex", alignItems: "center", gap: "15px" },
  avatar: {
    width: "42px",
    height: "42px",
    background: "#eff6ff",
    color: "#3b82f6",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "18px",
  },
  uName: { fontWeight: "600", color: "#1e293b", fontSize: "15px" },
  uPass: { fontSize: "12px", color: "#94a3b8", marginTop: "2px" },
  badgeUser: {
    background: "#f0fdf4",
    color: "#16a34a",
    padding: "6px 14px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "600",
  },
  badgeAdmin: {
    background: "#fff1f2",
    color: "#e11d48",
    padding: "6px 14px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "600",
  },
  inlineAddBranch: { display: "flex", gap: "8px" },
  tableInputSearch: {
    border: "1.5px solid #f1f5f9",
    padding: "8px 12px",
    borderRadius: "10px",
    fontSize: "13px",
    minWidth: "180px",
    outline: "none",
  },
  btnTableSave: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "600",
  },
  actionGroup: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  branchRow: { borderBottom: "1px solid #f8fafc" },
  branchCell: { padding: "0 24px 20px 72px" },
  chipsContainer: { display: "flex", flexWrap: "wrap", gap: "8px" },
  branchChip: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "6px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "500",
    border: "1px solid #e2e8f0",
  },
  chipRemove: { cursor: "pointer", color: "#94a3b8", fontSize: "16px" },
  noBranchText: { color: "#cbd5e1", fontSize: "12px", fontStyle: "italic" },
  btnEdit: {
    background: "#f0f9ff",
    border: "none",
    color: "#0369a1",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    padding: "8px 16px",
    borderRadius: "8px",
  },
  btnDelete: {
    background: "#fff1f2",
    border: "none",
    color: "#be123c",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    padding: "8px 16px",
    borderRadius: "8px",
  },
  btnCancel: {
    background: "#f1f5f9",
    color: "#64748b",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    fontWeight: "600",
    cursor: "pointer",
    flex: 1,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#fff",
    padding: "32px",
    borderRadius: "24px",
    width: "450px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  modalClose: { cursor: "pointer", color: "#94a3b8" },
  modalBody: { display: "flex", flexDirection: "column", gap: "18px" },
  modalFooter: { display: "flex", gap: "10px", marginTop: "10px" },
};