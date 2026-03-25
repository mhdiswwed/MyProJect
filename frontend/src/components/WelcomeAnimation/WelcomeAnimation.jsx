// אנימציית פתיחה קצרה אחרי התחברות
import { useEffect } from "react";
import Lottie from "lottie-react";
import animation from "../../assets/animations/welcome-animation.json";
import styles from "./WelcomeAnimation.module.css";

export default function WelcomeAnimation({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(() => onFinish(), 3000); // 3 seconds
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <div className={styles.container}>
      <Lottie
        animationData={animation}
        loop={false}
        className={styles.animation}
      />
    </div>
  );
}
