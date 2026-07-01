self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const isArabic = (navigator.language || "en").toLowerCase().startsWith("ar");

  const title = isArabic
    ? (data.titleAr || data.title || "مورد جديد متاح")
    : (data.titleEn || data.title || "New Resource Available");

  const body = isArabic
    ? (data.bodyAr || data.body || "عزيزي عضو اللجنة، تمت إضافة مورد جديد")
    : (data.bodyEn || data.body || "Dear committee member, a new resource has been added");

  const options = {
    body,
    icon: "/acted-logo-notification.PNG",
    badge: "/acted-logo-notification.PNG",
    dir: isArabic ? "rtl" : "ltr",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
