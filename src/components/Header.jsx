import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Header({ hasUnsavedChanges = false }) {
  const navigate = useNavigate();

  const handleMainSiteClick = (e) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmLeave) {
        e.preventDefault();
        return;
      }
    }
  };

  return (
    <header style={styles.header}>
      {/* Logo → Main Landing Page */}
      <Link to="/" style={styles.logo}>
        <img
          src="/logo.png"
          alt="Logo"
          style={styles.logoImg}
        />
      </Link>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Main Site Link */}
      <Link
        to="/"
        onClick={handleMainSiteClick}
        style={styles.mainLink}
      >
        🏠 Main Site
      </Link>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    borderBottom: "1px solid #eee",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
  },
  logoImg: {
    height: "32px",
    cursor: "pointer",
  },
  mainLink: {
    textDecoration: "none",
    fontSize: "14px",
    color: "#555",
    padding: "6px 10px",
    borderRadius: "6px",
    transition: "background 0.2s",
  },
};
