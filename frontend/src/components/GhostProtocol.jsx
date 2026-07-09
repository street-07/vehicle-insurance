import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import "./GhostProtocol.css";

const GhostProtocol = ({ user, children }) => {
  const [blackout, setBlackout] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") return;

    let blackoutTimer;
    let focusTimer;
    let lastScreenshotTime = 0;

    const handleKeyDown = (e) => {
      // Catch PrintScreen (44) or Windows/Mac + Shift combinations EARLY
      if (
        e.keyCode === 44 || 
        e.key === 'PrintScreen' ||
        (e.shiftKey && e.metaKey) // Trigger early when modifiers are held
      ) {
        lastScreenshotTime = Date.now();
        flushSync(() => {
          setBlackout(true);
        });
        try {
          const clipPromise = navigator.clipboard.writeText('Security Policy: Content copying is disabled.');
          if (clipPromise) clipPromise.catch(() => {});
        } catch (err) {
          console.error("Clipboard write blocked", err);
        }
        
        clearTimeout(blackoutTimer);
        blackoutTimer = setTimeout(() => {
          if (document.hasFocus() && Date.now() - lastScreenshotTime > 4000) {
            setBlackout(false);
          }
        }, 4500);
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      alert("Copying is disabled.");
    };

    const handleBlur = () => {
      clearTimeout(focusTimer);
      flushSync(() => {
        setBlackout(true);
      });
    };

    const handleFocus = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (document.hasFocus() && Date.now() - lastScreenshotTime > 4000) {
          setBlackout(false);
        }
      }, 300);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyDown); // Sometimes PrtScn fires on keyup
    window.addEventListener("copy", handleCopy);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Initial check in case it's already blurred
    if (!document.hasFocus() && !blackout) {
      setBlackout(true);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyDown);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(blackoutTimer);
      clearTimeout(focusTimer);
    };
  }, [user]);

  if (user?.role === "admin") return <>{children}</>;

  return (
    <div className={`ghost-protocol-wrapper ${blackout ? 'blackout-active' : ''}`}>
      {children}
    </div>
  );
};

export default GhostProtocol;
