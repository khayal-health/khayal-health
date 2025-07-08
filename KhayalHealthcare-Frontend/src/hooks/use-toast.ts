let toastContainer: HTMLDivElement | null = null;
let toastCounter = 0;

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

function createToastContainer() {
  if (toastContainer) return toastContainer;

  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    pointer-events: none;
    max-width: 420px;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

function createToastElement(options: ToastOptions & { id: string }) {
  const toastEl = document.createElement("div");
  toastEl.id = `toast-${options.id}`;
  toastEl.style.cssText = `
    background: ${
      options.variant === "destructive"
        ? "linear-gradient(to right, #dc2626, #ef4444)"
        : "#ffffff"
    };
    color: ${options.variant === "destructive" ? "#ffffff" : "#1a1a1a"};
    border: ${
      options.variant === "destructive"
        ? "none"
        : "1px solid rgba(0, 0, 0, 0.08)"
    };
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 12px;
    box-shadow: ${
      options.variant === "destructive"
        ? "0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 8px 10px -6px rgba(239, 68, 68, 0.3)"
        : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
    };
    pointer-events: auto;
    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    word-wrap: break-word;
    min-width: 300px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  `;

  toastEl.onmouseenter = () => {
    toastEl.style.transform = "translateY(-2px)";
    toastEl.style.boxShadow =
      options.variant === "destructive"
        ? "0 15px 30px -5px rgba(239, 68, 68, 0.4), 0 10px 15px -6px rgba(239, 68, 68, 0.4)"
        : "0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -6px rgba(0, 0, 0, 0.08)";
  };

  toastEl.onmouseleave = () => {
    toastEl.style.transform = "translateY(0)";
    toastEl.style.boxShadow =
      options.variant === "destructive"
        ? "0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 8px 10px -6px rgba(239, 68, 68, 0.3)"
        : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)";
  };

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background: ${
      options.variant === "destructive"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.05)"
    };
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    cursor: pointer;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    outline: none;
  `;

  closeBtn.onmouseenter = () => {
    closeBtn.style.background =
      options.variant === "destructive"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.1)";
    closeBtn.style.transform = "scale(1.1)";
  };

  closeBtn.onmouseleave = () => {
    closeBtn.style.background =
      options.variant === "destructive"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.05)";
    closeBtn.style.transform = "scale(1)";
  };

  closeBtn.onclick = () => removeToast(options.id);

  const content = document.createElement("div");
  content.style.cssText = "margin-right: 30px;";

  if (options.title) {
    const titleEl = document.createElement("div");
    titleEl.style.cssText = `
      font-weight: 600; 
      margin-bottom: 4px;
      font-size: 15px;
      line-height: 1.4;
      letter-spacing: -0.01em;
    `;
    titleEl.textContent = options.title;
    content.appendChild(titleEl);
  }

  if (options.description) {
    const descEl = document.createElement("div");
    descEl.style.cssText = `
      font-size: 14px; 
      opacity: ${options.variant === "destructive" ? "0.95" : "0.7"};
      line-height: 1.5;
      font-weight: 400;
    `;
    descEl.textContent = options.description;
    content.appendChild(descEl);
  }

  toastEl.appendChild(content);
  toastEl.appendChild(closeBtn);

  return toastEl;
}

function removeToast(id: string) {
  const toastEl = document.getElementById(`toast-${id}`);
  if (toastEl) {
    toastEl.style.animation = "slideOut 0.3s cubic-bezier(0.4, 0, 1, 1)";
    setTimeout(() => {
      toastEl.remove();
    }, 300);
  }
}

if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(calc(100% + 32px));
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(calc(100% + 32px));
        opacity: 0;
      }
    }
      
    #toast-container * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
        "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", 
        "Segoe UI Emoji", "Segoe UI Symbol";
    }
  `;
  document.head.appendChild(style);
}

function toast(options: ToastOptions) {
  const id = (++toastCounter).toString();
  const container = createToastContainer();
  const toastEl = createToastElement({ ...options, id });

  container.appendChild(toastEl);
  const duration = options.duration || 5000;
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return {
    id,
    dismiss: () => removeToast(id),
  };
}

function useToast() {
  return {
    toast,
    toasts: [],
    dismiss: () => {},
  };
}

export { useToast, toast };
