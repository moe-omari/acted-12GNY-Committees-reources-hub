"use client";

import Image from "next/image";
import { useLanguage } from "@/components/language-context";
import { NotificationBell } from "@/components/notification-bell";

const labels = {
  en: {
    heading: "Site Committee Resource Hub",
    switchTo: "العربية",
  },
  ar: {
    heading: "مركز موارد لجنة إدارة الموقع",
    switchTo: "English",
  },
};

export function AppHeader() {
  const { lang, toggleLang } = useLanguage();
  const copy = labels[lang];

  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <div className="brand-logo-wrap">
          <Image
            src="/logo-acted-blanc.png"
            alt="ACTED"
            width={120}
            height={42}
            className="brand-logo"
            style={{ height: "var(--logo-h, 44px)", width: "auto" }}
            priority
          />
        </div>

        <h1 className="brand-title">{copy.heading}</h1>

        <div className="brand-actions">
          <NotificationBell />
          <button type="button" className="action-chip action-chip--header" onClick={toggleLang}>
            {copy.switchTo}
          </button>
        </div>
      </div>
    </header>
  );
}
