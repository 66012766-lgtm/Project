import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VisitForm() {
  const navigate = useNavigate();

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

  useEffect(() => {
    const loadUser = () => {
      const savedUser = JSON.parse(localStorage.getItem("user")) || {};
      if (!savedUser.username) {
        navigate("/", { replace: true });
        return;
      }
      setCurrentUser(savedUser);
    };

    const loadForm = () => {
      const storedForm = JSON.parse(localStorage.getItem("formConfig")) || [];
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
    if (currentUser?.id) {
      fetch(`http://localhost:5000/api/user-branches-list/${currentUser.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            const branchNames = data.map((item) => item.display_name);
            setVisibleBranches(branchNames);
          }
        })
        .catch((err) => console.error("Error fetching branches:", err));
    }
  }, [currentUser]);

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
    if (formData["สาขา"] && !visibleBranches.includes(formData["สาขา"])) {
      setFormData((prev) => ({ ...prev, สาขา: "" }));
    }
  }, [visibleBranches, formData]);

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
    setIsSubmitting(true);
    try {
      const payload = {
        userId: currentUser?.id,
        workplace: formData["สาขา"],
        description: formData.reason,
        issue_text: formData.problem,
        resolution_text: formData.resolution_text,
        work_date: formData.visitDate,
        before_images: formData.beforeImages.map((img) => img.preview),
        after_images: formData.afterImages.map((img) => img.preview),
      };

      const response = await fetch("http://localhost:5000/api/save-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
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
      }
    } catch (error) {
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
              <button type="button" style={styles.reportBtn} onClick={() => navigate("/report")}>
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
                <label style={styles.label}>วันที่เข้าสาขา <span style={styles.required}>*</span></label>
                <input type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>สาขาที่เข้าปฏิบัติงาน <span style={styles.required}>*</span></label>
                <select name="สาขา" value={formData["สาขา"]} onChange={handleChange} style={styles.select}>
                  <option value="">กรุณาเลือกสาขา</option>
                  {visibleBranches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
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
              <label style={styles.label}>รายละเอียดและปัญหาที่ตรวจพบ <span style={styles.required}>*</span></label>
              <textarea
                name="problem"
                value={formData.problem}
                onChange={handleChange}
                placeholder="โปรดอธิบายสถานการณ์หรือปัญหาที่พบเจอดโดยละเอียด..."
                style={styles.textarea}
              />
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={styles.label}>การจัดการปัญหา / แนวทางแก้ไข <span style={styles.required}>*</span></label>
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
                  <div style={styles.uploadLabel}>ภาพก่อนตรวจ (Before)</div>
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
                    <div key={i} style={styles.imageCard}>
                      <img src={file.preview} alt="" style={styles.imageThumb} />
                      <button type="button" style={styles.deleteIcon} onClick={() => removeFile("beforeImages", i)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.uploadArea}>
                <div style={styles.uploadHeader}>
                  <div style={styles.uploadLabel}>ภาพหลังตรวจ (After)</div>
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
                    <div key={i} style={styles.imageCard}>
                      <img src={file.preview} alt="" style={styles.imageThumb} />
                      <button type="button" style={styles.deleteIcon} onClick={() => removeFile("afterImages", i)}>
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
    background: "#f1f5f9",
    padding: "40px 20px"
  },
  contentWrap: {
    maxWidth: "1000px",
    margin: "0 auto"
  },
  heroCard: {
    background: "#fff",
    borderRadius: "32px",
    padding: "40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "20px",
    marginBottom: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
  },
  heroContent: {
    flex: 1
  },
  badgeRow: {
    marginBottom: "16px"
  },
  userBadge: {
    background: "#f0f7ff",
    color: "#1e40af",
    padding: "6px 14px",
    borderRadius: "100px",
    fontWeight: "700",
    fontSize: "13px"
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    background: "#10b981",
    borderRadius: "50%",
    display: "inline-block",
    marginRight: "8px"
  },
  pageTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a"
  },
  pageSubtitle: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "14px"
  },
  topActions: {
    display: "flex",
    gap: "10px"
  },
  reportBtn: {
    height: "48px",
    padding: "0 20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },
  logoutBtn: {
    height: "48px",
    padding: "0 20px",
    borderRadius: "14px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },
  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#fff",
    borderLeft: "6px solid #16a34a",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  successIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#16a34a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  successTitle: {
    fontWeight: "800",
    color: "#065f46"
  },
  successText: {
    fontSize: "14px",
    color: "#065f46"
  },
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  sectionCard: {
    background: "#fff",
    borderRadius: "24px",
    padding: "32px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px"
  },
  iconBox: {
    width: "40px",
    height: "40px",
    background: "#f0f7ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px"
  },
  sectionEyebrow: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a"
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  fieldWrap: {
    marginBottom: "20px"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#475569"
  },
  required: {
    color: "#ef4444"
  },
  input: {
    width: "100%",
    height: "50px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "0 16px",
    outline: "none"
  },
  select: {
    width: "100%",
    height: "50px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "0 16px",
    outline: "none"
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    outline: "none",
    resize: "vertical"
  },
  uploadArea: {
    background: "#f8fafc",
    borderRadius: "20px",
    padding: "20px"
  },
  uploadHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px"
  },
  uploadLabel: {
    fontSize: "14px",
    fontWeight: "700"
  },
  uploadTrigger: {
    background: "#2563eb",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "8px",
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
    width: "70px",
    height: "70px",
    borderRadius: "10px",
    overflow: "hidden"
  },
  imageThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  deleteIcon: {
    position: "absolute",
    top: "2px",
    right: "2px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "10px",
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  submitSection: {
    marginTop: "10px"
  },
  submitBtn: {
    width: "100%",
    height: "60px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    fontSize: "16px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
  },
  submitBtnDisabled: {
    width: "100%",
    height: "60px",
    background: "#cbd5e1",
    color: "#94a3b8",
    border: "none",
    borderRadius: "16px",
    cursor: "not-allowed"
  }
};