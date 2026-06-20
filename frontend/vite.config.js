/*import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
*/

//לבדיקה בטלפון
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
});

//אומרת ל־ngrok:
//"קח את האתר שרץ אצלי במחשב על פורט 3000 ותן לו כתובת HTTPS באינטרנט."
//ngrok http 3000 //זה הפקודה מריץ לתרמינל חדש ולוקח מהתרמנל שנפתח קתובת ופותח בתלפון
