/**
 * WeatherForecast
 * קומפוננטת תחזית מזג אוויר שבועית לבית ג׳ן
 */

import { useEffect, useState } from "react";
import styles from "./weatherForecast.module.css";

// שליפת מפתח ה־API מקובץ הסביבה
const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

export default function WeatherForecast() {
  const [forecast, setForecast] = useState([]);

  // שליפת תחזית מזג אוויר מ־OpenWeather
  //לפי הקואורדינטות של בית ג'ן
  useEffect(() => {
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=32.965&lon=35.381&units=metric&lang=he&appid=${API_KEY}`,
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data);

        if (!data.list) return;

        const daily = data.list.filter((item) =>
          item.dt_txt.includes("12:00:00"),
        );

        setForecast(daily);
      });
  }, []);

  return (
    <div className={styles.weatherBox}>
      <h2 className={styles.title}>תחזית לבית ג׳ן</h2>

      <div className={styles.daysRow}>
        {forecast.map((day, index) => (
          <div key={index} className={styles.dayCard}>
            <p className={styles.dayName}>
              {new Date(day.dt_txt).toLocaleDateString("he-IL", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
            </p>

            <img
              src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
              alt={day.weather[0].description}
            />

            <p className={styles.temp}>{Math.round(day.main.temp)}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
