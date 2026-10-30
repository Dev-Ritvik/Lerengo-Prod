"use client";

import { useState, useEffect, useTransition, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { updateProfile } from "./actions";
import styles from "./edit-profile-modal.module.css";

type EditProfileModalProps = {
  initialData: {
    fullName: string;
    department: string;
    programDomain: string;
    batch: string;
    avatarUrl: string;
  };
};

export function EditProfileModal({ initialData }: EditProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(initialData.fullName);
  const [department, setDepartment] = useState(initialData.department);
  const [programDomain, setProgramDomain] = useState(initialData.programDomain);
  const [batch, setBatch] = useState(initialData.batch);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "">("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage("Image size must be less than 2MB");
      setStatusTone("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setAvatarUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setStatusMessage("");
    setStatusTone("");

    startTransition(async () => {
      const res = await updateProfile({
        fullName,
        department,
        programDomain,
        batch,
        avatarUrl,
      });

      if (res.success) {
        setStatusMessage("Profile updated successfully!");
        setStatusTone("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatusMessage("");
        }, 1500);
      } else {
        setStatusMessage(res.error || "Failed to update profile");
        setStatusTone("error");
      }
    });
  };

  return (
    <>
      <button 
        className={styles.editTrigger} 
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ marginRight: "6px" }}
        >
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
        Edit Profile
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
          <div 
            className={styles.modalContainer} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Profile Portfolio</h2>
              <button 
                className={styles.closeButton} 
                onClick={() => setIsOpen(false)}
                type="button"
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.avatarSection}>
                <div className={styles.avatarPreviewWrap}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar preview" className={styles.avatarPreview} />
                  ) : (
                    <span className={styles.avatarPlaceholder}>
                      {fullName ? fullName.slice(0, 2).toUpperCase() : "U"}
                    </span>
                  )}
                </div>
                <div className={styles.avatarUploadControls}>
                  <label className={styles.uploadLabel}>
                    Choose Image File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className={styles.fileInput} 
                    />
                  </label>
                  <span className={styles.uploadHint}>Max size: 2MB. Supports PNG, JPG, WEBP.</span>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span className={styles.formLabel}>Full Name</span>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Enter your full name"
                    className={styles.textInput}
                  />
                </label>

                <label className={styles.formField}>
                  <span className={styles.formLabel}>Department</span>
                  <input 
                    type="text" 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                    placeholder="e.g. Computer Science, Pharmacy"
                    className={styles.textInput}
                  />
                </label>

                <label className={styles.formField}>
                  <span className={styles.formLabel}>Program / Course Domain</span>
                  <input 
                    type="text" 
                    value={programDomain} 
                    onChange={(e) => setProgramDomain(e.target.value)} 
                    placeholder="e.g. B.Tech CSE, M.Pharm"
                    className={styles.textInput}
                  />
                </label>

                <label className={styles.formField}>
                  <span className={styles.formLabel}>Batch / Graduation Year</span>
                  <input 
                    type="text" 
                    value={batch} 
                    onChange={(e) => setBatch(e.target.value)} 
                    placeholder="e.g. Class of 2026"
                    className={styles.textInput}
                  />
                </label>

                <label className={styles.formField}>
                  <span className={styles.formLabel}>Profile Photo URL (Optional)</span>
                  <input 
                    type="text" 
                    value={avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    placeholder="Alternatively, paste any image link directly"
                    className={styles.textInput}
                  />
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {statusMessage && (
                <p className={`${styles.statusMessage} ${statusTone === "success" ? styles.statusSuccess : styles.statusError}`}>
                  {statusMessage}
                </p>
              )}
              <div className={styles.actionButtons}>
                <button 
                  className={styles.cancelBtn} 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  className={styles.saveBtn} 
                  onClick={handleSave}
                  disabled={isPending}
                  type="button"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
