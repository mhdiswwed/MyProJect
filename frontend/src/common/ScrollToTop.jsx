import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // או "smooth"
    });
  }, [pathname]);

  return null;
}

//מחזיר אותי להתחלת הדף ולא לסוף הדף