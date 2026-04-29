import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VisitForm() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [currentUser, setCurrentUser] = useState(null);
  const [formConfig, setFormConfig] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [visibleBranches, setVisibleBranches] = useState([]);

  const [formData, setFormData] = useState({
    visitDate: "",
    reason: "",
    problem: "",
    resolution_text: "",
    สาขา: "",
    beforeImages: [],
    afterImages: [],
  });

  const getBranchLabel = (branch) => {
    if (!branch) return "";

    const retailer = branch.retailer || branch.Retailer || "";
    const brand = branch.brand || branch.Brand || "";
    const storeName =
      branch.store_name ||
      branch.storeName ||
      branch["Store Name"] ||
      branch.code
      branch["Retailer - Store Name"] ||
      ``
    

    return (
      branch.name ||
      branch.display_name ||
      branch.branch_name ||
      branch.branch_display_name ||
      branch["Retailer - Store Name (Brand)"] ||
      branch["Retailer - Store Name"] ||
      (retailer && storeName && brand
        ? `${retailer} - ${storeName} (${brand})`
        : retailer && storeName
        ? `${retailer} - ${storeName}`
        : "")
    );
  };

  useEffect(() => {
    const loadUser = () => {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (!savedUser.username) {
        navigate("/", { replace: true });
        return;
      }
      setCurrentUser(savedUser);
    };

    const loadForm = () => {
      const storedForm = JSON.parse(localStorage.getItem("formConfig") || "[]");
      setFormConfig(storedForm);
    };

    loadUser();
    loadForm();

    window.addEventListener("usersUpdated", loadUser);
    window.addEventListener("formConfigUpdated", loadForm);
    window.addEventListener("storage", loadUser);
    window.addEventListener("storage", loadForm);

    return () => {
      window.removeEventListener("usersUpdated", loadUser);
      window.removeEventListener("formConfigUpdated", loadForm);
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("storage", loadForm);
    };
  }, [navigate]);
  useEffect(() => {
    if (!currentUser?.username) return;

 fetch(
  `${API_URL}/api/branches?username=${encodeURIComponent(
    currentUser.username
  )}&role=${encodeURIComponent(currentUser.role || "")}`
).then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(data?.message || data?.error || "โหลดสาขาไม่สำเร็จ");
        }
        return data;
      })
      .then((data) => {
        setVisibleBranches(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error fetching branches:", err);
        setVisibleBranches([]);
      });
  }, [currentUser, API_URL]);
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (
      formData["สาขา"] &&
      !visibleBranches.some((branch) => getBranchLabel(branch) === formData["สาขา"])
    ) {
      setFormData((prev) => ({ ...prev, สาขา: "" }));
    }
  }, [visibleBranches, formData["สาขา"]]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file: file,
          name: file.name,
          type: file.type,
          size: file.size,
          preview: reader.result,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e, fieldName) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 5) {
      alert("แนบไฟล์ได้สูงสุด 5 ไฟล์ต่อรายการ");
      e.target.value = "";
      return;
    }

    try {
      const mappedFiles = await Promise.all(files.map(fileToDataUrl));
      setFormData((prev) => ({ ...prev, [fieldName]: mappedFiles }));
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถอ่านไฟล์ได้");
    }

    e.target.value = "";
  };

  const removeFile = (fieldName, indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.visitDate ||
      !formData["สาขา"] ||
      !formData.problem.trim() ||
      !formData.resolution_text.trim()
    ) {
      alert("กรุณากรอกข้อมูลที่มี * ให้ครบ รวมถึงแนวทางแก้ไข");
      return;
    }

    const selectedBranch = visibleBranches.find(
      (branch) => getBranchLabel(branch) === formData["สาขา"]
    );

    if (!selectedBranch) {
      alert("ไม่พบข้อมูลสาขาที่เลือก");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        username: currentUser?.username || "",
        user_id: currentUser?.id || null,
        visit_date: formData.visitDate,
        branch_id: selectedBranch.id || null,
        branch_display_name: getBranchLabel(selectedBranch),
        retailer: selectedBranch.retailer || selectedBranch.Retailer || "",
        brand: selectedBranch.brand || selectedBranch.Brand || "",
        store_name:
          selectedBranch.store_name ||
          selectedBranch.storeName ||
          selectedBranch["Store Name"] ||
          selectedBranch["Retailer - Store Name"] ||
          selectedBranch.branch_name ||
          "",
        purpose: formData.reason || "",
        detail: formData.problem || "",
        solution: formData.resolution_text || "",
        before_images: formData.beforeImages.map((img) => img.preview),
        after_images: formData.afterImages.map((img) => img.preview),
      };

      console.log("save payload =>", payload);

      const response = await fetch(`${API_URL}/api/save-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("save-visit error:", result);
        alert(result.message || result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        return;
      }

      setSuccessMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      setFormData({
        visitDate: "",
        reason: "",
        problem: "",
        resolution_text: "",
        สาขา: "",
        beforeImages: [],
        afterImages: [],
      });

      window.dispatchEvent(new Event("visitFormUpdated"));
    } catch (error) {
      console.error("submit error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.contentWrap}>
        <div style={styles.heroCard}>
          <div style={styles.heroContent}>
            <div style={styles.badgeRow}>
              <div style={styles.userBadge}>
                <span style={styles.onlineDot}></span>
                ผู้ใช้งาน: {currentUser?.username || "-"}
              </div>
            </div>
            <h1 style={styles.pageTitle}>แบบฟอร์มตรวจเช็คสินค้า</h1>
            <p style={styles.pageSubtitle}>
              ระบบบันทึกรายงานการเข้าตรวจงาน กรุณาระบุข้อมูลและรูปภาพเพื่อประสิทธิภาพในการตรวจสอบ
            </p>
          </div>
          <div style={styles.topActions}>
            {currentUser?.role === "admin" && (
              <button
                type="button"
                style={styles.reportBtn}
                onClick={() => navigate("/report")}
              >
                ดูรายงาน
              </button>
            )}
            <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </div>
        </div>

        {successMessage && (
          <div style={styles.successAlert}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successContent}>
              <div style={styles.successTitle}>Successfully Saved</div>
              <div style={styles.successText}>{successMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconBox}>📋</div>
              <div>
                <div style={styles.sectionEyebrow}>Primary Details</div>
                <div style={styles.sectionTitle}>ข้อมูลการปฏิบัติงาน</div>
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>
                  วันที่เข้าสาขา <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>
                  สาขาที่เข้าปฏิบัติงาน <span style={styles.required}>*</span>
                </label>
                <select
                  name="สาขา"
                  value={formData["สาขา"]}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">กรุณาเลือกสาขา</option>
                  {visibleBranches.map((branch, index) => {
                    const label = getBranchLabel(branch);
                    return (
                      <option
                        key={branch.mongo_id || branch._id || branch.id || `${label}-${index}`}
                        value={label}
                      >
                        {label || `สาขา ${index + 1}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>วัตถุประสงค์ในการเข้างาน</label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="เช่น เข้าตรวจเช็คระบบการทำงาน"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>
                รายละเอียดและปัญหาที่ตรวจพบ <span style={styles.required}>*</span>
              </label>
              <textarea
                name="problem"
                value={formData.problem}
                onChange={handleChange}
                placeholder="โปรดอธิบายสถานการณ์หรือปัญหาที่พบเจอดโดยละเอียด..."
                style={styles.textarea}
              />
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={styles.label}>
                การจัดการปัญหา / แนวทางแก้ไข <span style={styles.required}>*</span>
              </label>
              <textarea
                name="resolution_text"
                style={styles.textarea}
                placeholder="ระบุวิธีการแก้ไขปัญหาหรือสิ่งที่ได้ดำเนินการไปแล้ว..."
                value={formData.resolution_text}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconBox}>📸</div>
              <div>
                <div style={styles.sectionEyebrow}>Media Evidence</div>
                <div style={styles.sectionTitle}>หลักฐานภาพถ่าย</div>
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.uploadArea}>
                <div style={styles.uploadHeader}>
                  <div style={styles.uploadLabel}>ภาพก่อนตรวจ Before (สูงสุด5รูป)</div>
                  <label style={styles.uploadTrigger}>
                    เพิ่มรูป
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, "beforeImages")}
                      style={styles.hiddenInput}
                    />
                  </label>
                </div>
                <div style={styles.previewContainer}>
                  {formData.beforeImages.map((file, i) => (
                    <div key={`${file.name}-${i}`} style={styles.imageCard}>
                      <img src={file.preview} alt="" style={styles.imageThumb} />
                      <button
                        type="button"
                        style={styles.deleteIcon}
                        onClick={() => removeFile("beforeImages", i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.uploadArea}>
                <div style={styles.uploadHeader}>
                  <div style={styles.uploadLabel}>ภาพหลังตรวจ After (สูงสุด5รูป)</div>
                  <label style={styles.uploadTrigger}>
                    เพิ่มรูป
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, "afterImages")}
                      style={styles.hiddenInput}
                    />
                  </label>
                </div>
                <div style={styles.previewContainer}>
                  {formData.afterImages.map((file, i) => (
                    <div key={`${file.name}-${i}`} style={styles.imageCard}>
                      <img src={file.preview} alt="" style={styles.imageThumb} />
                      <button
                        type="button"
                        style={styles.deleteIcon}
                        onClick={() => removeFile("afterImages", i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.submitSection}>
            <button
              type="submit"
              style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังบันทึกข้อมูล..." : "ส่งรายงานเข้าตรวจงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    padding: "24px 14px 40px",
    boxSizing: "border-box"
  },

  contentWrap: {
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto"
  },

  heroCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)"
  },

  heroContent: {
    flex: "1 1 420px",
    minWidth: 0
  },

  badgeRow: {
    marginBottom: "12px"
  },

  userBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
    fontSize: "13px",
    border: "1px solid #bfdbfe"
  },

  onlineDot: {
    width: "8px",
    height: "8px",
    background: "#22c55e",
    borderRadius: "50%",
    display: "inline-block"
  },

  pageTitle: {
    margin: 0,
    fontSize: "clamp(28px, 5vw, 36px)",
    lineHeight: 1.2,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.02em"
  },

  pageSubtitle: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.7,
    maxWidth: "640px"
  },

  topActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    width: "100%"
  },

  reportBtn: {
    flex: "1 1 140px",
    minHeight: "46px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: "700",
    cursor: "pointer"
  },

  logoutBtn: {
    flex: "1 1 140px",
    minHeight: "46px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(37, 99, 235, 0.18)"
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "16px"
  },

  successIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    background: "#16a34a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: "800"
  },

  successTitle: {
    fontWeight: "800",
    color: "#166534",
    fontSize: "14px"
  },

  successText: {
    fontSize: "13px",
    color: "#166534",
    lineHeight: 1.5
  },

  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },

  sectionCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.03)"
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px"
  },

  iconBox: {
    width: "40px",
    height: "40px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0
  },

  sectionEyebrow: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "2px"
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 1.3
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px"
  },

  fieldWrap: {
    marginBottom: "16px"
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155"
  },

  required: {
    color: "#ef4444"
  },

  input: {
    width: "100%",
    minHeight: "50px",
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #dbe2ea",
    borderRadius: "12px",
    padding: "0 14px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "15px"
  },

  select: {
    width: "100%",
    minHeight: "50px",
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #dbe2ea",
    borderRadius: "12px",
    padding: "0 14px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "15px"
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #dbe2ea",
    borderRadius: "12px",
    padding: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    fontSize: "15px",
    lineHeight: 1.65
  },

  uploadArea: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "16px",
    padding: "16px"
  },

  uploadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
    flexWrap: "wrap"
  },

  uploadLabel: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155"
  },

  uploadTrigger: {
    background: "#2563eb",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer"
  },

  hiddenInput: {
    display: "none"
  },

  previewContainer: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },

  imageCard: {
    position: "relative",
    width: "76px",
    height: "76px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#ffffff"
  },

  imageThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },

  deleteIcon: {
    position: "absolute",
    top: "5px",
    right: "5px",
    background: "rgba(239,68,68,0.95)",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "11px",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  submitSection: {
    marginTop: "2px"
  },

  submitBtn: {
    width: "100%",
    minHeight: "54px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)"
  },

  submitBtnDisabled: {
    width: "100%",
    minHeight: "54px",
    background: "#cbd5e1",
    color: "#64748b",
    border: "none",
    borderRadius: "14px",
    cursor: "not-allowed"
  }
};