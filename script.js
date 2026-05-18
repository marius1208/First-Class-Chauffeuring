const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const bookingForm = document.querySelector(".booking-form");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18
  });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (bookingForm) {
  const submitButton = bookingForm.querySelector("button[type='submit']");
  const statusMessage = bookingForm.querySelector(".form-status");
  const fallbackLink = bookingForm.querySelector(".form-fallback");
  const formEndpoint = "https://formsubmit.co/ajax/contact@1stclasschauffeuring.co.uk";

  const setStatus = (message, type) => {
    if (!statusMessage) {
      return;
    }

    statusMessage.textContent = message;
    statusMessage.dataset.status = type;
  };

  const buildMailtoLink = (formData) => {
    const name = formData.get("name") || "";
    const phone = formData.get("phone") || "";
    const email = formData.get("email") || "";
    const journey = formData.get("journey") || "";
    const subject = "First Class Chauffeuring enquiry";
    const body = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      "",
      "Journey details:",
      journey
    ].join("\n");

    return `mailto:contact@1stclasschauffeuring.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 18000);

    if (fallbackLink) {
      fallbackLink.href = buildMailtoLink(formData);
      fallbackLink.classList.remove("is-visible");
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    setStatus("Sending your enquiry...", "pending");

    try {
      const response = await fetch(formEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`FormSubmit returned ${response.status}`);
      }

      bookingForm.reset();
      setStatus("Thank you. Your enquiry has been sent and we will be in touch shortly.", "success");
    } catch (error) {
      setStatus("We could not send the form right now. Please use the direct email link below or call us.", "error");

      if (fallbackLink) {
        fallbackLink.classList.add("is-visible");
      }
    } finally {
      window.clearTimeout(timeout);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Enquiry";
      }
    }
  });
}
