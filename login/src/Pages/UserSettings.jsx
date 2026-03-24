import React, { useState, useEffect } from "react";

export default function UserSettings() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    fetch("/users.json")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);

  const addUser = () => {
    if (!newUser.username || !newUser.password) {
      alert("กรอกข้อมูลให้ครบ");
      return;
    }

    setUsers([...users, newUser]);
    setNewUser({ username: "", password: "" });
  };

  const exportUsers = () => {
    const blob = new Blob([JSON.stringify(users, null, 2)], {
      type: "application/json",
    });
    const handleAddUser = () => {
  const users = JSON.parse(localStorage.getItem("users")) || [];

  const newUser = {
    id: Date.now(),
    username: newUsername,
    password: newPassword,
  };

  users.push(newUser);

  localStorage.setItem("users", JSON.stringify(users));

  alert("เพิ่ม user สำเร็จ");
};

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "users.json";
    a.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>จัดการผู้ใช้</h2>

      <input
        placeholder="username"
        value={newUser.username}
        onChange={(e) =>
          setNewUser({ ...newUser, username: e.target.value })
        }
      />

      <input
        placeholder="password"
        type="password"
        value={newUser.password}
        onChange={(e) =>
          setNewUser({ ...newUser, password: e.target.value })
        }
      />

      <button onClick={addUser}>เพิ่มผู้ใช้</button>
      <button onClick={exportUsers}>Export</button>

      <ul>
        {users.map((u, i) => (
          <li key={i}>{u.username}</li>
        ))}
      </ul>
    </div>
  );
}