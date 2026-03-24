import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div style={{ background: "#1976d2", padding: "12px" }}>
      {user?.role === "staff" && (
        <Link to="/visit-form" style={{ color: "white", marginRight: "16px" }}>
          บันทึกข้อมูล
        </Link>
      )}

      {user?.role === "admin" && (
        <Link to="/admin-report" style={{ color: "white", marginRight: "16px" }}>
          ดูรายงาน
        </Link>
      )}

      <button onClick={handleLogout}>ออกจากระบบ</button>
    </div>
  );
}

export default Navbar;