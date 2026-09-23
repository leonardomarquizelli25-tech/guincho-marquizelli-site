(() => {
  "use strict";

  const conversionIds = {
    whatsapp: "AW-18146977499/Qa1CCO334IEdENvNk81D",
    phone: "AW-18146977499/U5ORCPD34IEdENvNk81D"
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;

    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    const conversion = href?.includes("wa.me")
      ? conversionIds.whatsapp
      : href?.toLowerCase().startsWith("tel:")
        ? conversionIds.phone
        : null;

    if (!conversion || typeof window.gtag !== "function") return;

    // Current WhatsApp links open in a new tab; tel: must open the dialer
    // directly. Only same-tab web navigation needs a brief send window.
    const waitForNavigation = conversion === conversionIds.whatsapp
      && event.button === 0
      && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
      && (!link.target || link.target.toLowerCase() === "_self");

    let timeoutId;
    let navigated = false;
    const finish = () => {
      if (!waitForNavigation || navigated) return;
      navigated = true;
      window.clearTimeout(timeoutId);
      window.location.assign(link.href);
    };

    if (waitForNavigation) {
      event.preventDefault();
      timeoutId = window.setTimeout(finish, 400);
    }

    try {
      window.gtag("event", "conversion", {
        send_to: conversion,
        value: 1.0,
        currency: "BRL",
        event_callback: finish,
        event_timeout: 400
      });
    } catch (_error) {
      finish();
    }
  });
})();
